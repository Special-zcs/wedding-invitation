import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { siteConfig as initialConfig } from '../config/siteConfig';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const CONFIG_KEY = 'wedding-site-config';
  const META_KEY = 'wedding-site-config-meta';
  const PENDING_KEY = 'wedding-site-config-pending';
  const CONFLICT_KEY = 'wedding-site-config-conflict';
  const AUTH_TOKEN_KEY = 'wedding-auth-token';
  const AUTH_EMAIL_KEY = 'wedding-auth-email';
  const API_BASE = import.meta.env.VITE_SETTINGS_API_BASE || 'http://localhost:4000';

  const safeParse = useCallback((value, fallback) => {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }, []);

  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved) : initialConfig;
  });
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || '');
  const [authEmail, setAuthEmail] = useState(() => localStorage.getItem(AUTH_EMAIL_KEY) || '');
  const [syncStatus, setSyncStatus] = useState({ state: 'idle', message: '', lastSyncAt: 0 });
  const syncTimerRef = useRef(null);
  const latestConfigRef = useRef(config);

  useEffect(() => {
    latestConfigRef.current = config;
  }, [config]);

  const getMeta = useCallback(() => {
    return safeParse(localStorage.getItem(META_KEY), { version: 0, updatedAt: 0 });
  }, [META_KEY, safeParse]);

  const setMeta = useCallback((meta) => {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }, [META_KEY]);

  const setLocalConfig = useCallback((newConfig) => {
    setConfig(newConfig);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
  }, [CONFIG_KEY]);

  const setPending = useCallback((settings, updatedAt) => {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ settings, updatedAt }));
  }, [PENDING_KEY]);

  const clearPending = useCallback(() => {
    localStorage.removeItem(PENDING_KEY);
  }, [PENDING_KEY]);

  const apiRequest = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      }
    });
    return response;
  }, [API_BASE, authToken]);

  const applyRemoteSettings = useCallback((settings, meta) => {
    if (settings) {
      setLocalConfig(settings);
      setMeta(meta);
      setSyncStatus({ state: 'idle', message: '已同步', lastSyncAt: meta.updatedAt || Date.now() });
    }
  }, [setLocalConfig, setMeta]);

  const pullSettings = useCallback(async () => {
    if (!authToken) return;
    if (!navigator.onLine) {
      setSyncStatus({ state: 'offline', message: '离线模式', lastSyncAt: syncStatus.lastSyncAt });
      return;
    }
    setSyncStatus({ state: 'syncing', message: '同步中', lastSyncAt: syncStatus.lastSyncAt });
    try {
      const res = await apiRequest('/settings', { method: 'GET' });
      if (res.status === 401) {
        setAuthToken('');
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setSyncStatus({ state: 'error', message: '认证失效', lastSyncAt: syncStatus.lastSyncAt });
        return;
      }
      if (!res.ok) {
        setSyncStatus({ state: 'error', message: '同步失败', lastSyncAt: syncStatus.lastSyncAt });
        return;
      }
      const data = await res.json();
      if (data && data.settings) {
        applyRemoteSettings(data.settings, { version: data.version || 0, updatedAt: data.updatedAt || Date.now() });
        clearPending();
      } else {
        setSyncStatus({ state: 'idle', message: '无远端数据', lastSyncAt: syncStatus.lastSyncAt });
      }
    } catch {
      setSyncStatus({ state: 'error', message: '网络异常', lastSyncAt: syncStatus.lastSyncAt });
    }
  }, [AUTH_TOKEN_KEY, apiRequest, applyRemoteSettings, authToken, clearPending, syncStatus.lastSyncAt]);

  const pushSettings = useCallback(async (settings, updatedAtOverride) => {
    if (!authToken) return;
    if (!navigator.onLine) {
      setSyncStatus({ state: 'offline', message: '离线模式', lastSyncAt: syncStatus.lastSyncAt });
      setPending(settings, updatedAtOverride || Date.now());
      return;
    }
    const meta = getMeta();
    const updatedAt = updatedAtOverride || meta.updatedAt || Date.now();
    setSyncStatus({ state: 'syncing', message: '同步中', lastSyncAt: syncStatus.lastSyncAt });
    try {
      const res = await apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          settings,
          clientVersion: meta.version || 0,
          updatedAt
        })
      });
      if (res.status === 401) {
        setAuthToken('');
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setSyncStatus({ state: 'error', message: '认证失效', lastSyncAt: syncStatus.lastSyncAt });
        return;
      }
      if (res.status === 409) {
        const data = await res.json();
        if (data && data.server && data.server.settings) {
          localStorage.setItem(CONFLICT_KEY, JSON.stringify({ local: settings, server: data.server }));
          applyRemoteSettings(data.server.settings, { version: data.server.version, updatedAt: data.server.updatedAt });
          setSyncStatus({ state: 'conflict', message: '存在冲突，已采用最新版本', lastSyncAt: data.server.updatedAt });
          clearPending();
          return;
        }
      }
      if (!res.ok) {
        setSyncStatus({ state: 'error', message: '同步失败', lastSyncAt: syncStatus.lastSyncAt });
        setPending(settings, updatedAt);
        return;
      }
      const data = await res.json();
      const nextMeta = { version: data.version || meta.version || 0, updatedAt: data.updatedAt || Date.now() };
      setMeta(nextMeta);
      clearPending();
      setSyncStatus({ state: 'idle', message: '已同步', lastSyncAt: nextMeta.updatedAt });
    } catch {
      setPending(settings, updatedAt);
      setSyncStatus({ state: 'error', message: '网络异常', lastSyncAt: syncStatus.lastSyncAt });
    }
  }, [AUTH_TOKEN_KEY, CONFLICT_KEY, apiRequest, applyRemoteSettings, authToken, clearPending, getMeta, setMeta, setPending, syncStatus.lastSyncAt]);

  const updateConfig = (newConfig) => {
    setLocalConfig(newConfig);
    const meta = getMeta();
    const nextMeta = { version: meta.version || 0, updatedAt: Date.now() };
    setMeta(nextMeta);
    setPending(newConfig, nextMeta.updatedAt);
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      pushSettings(latestConfigRef.current, nextMeta.updatedAt);
    }, 800);
  };

  const resetConfig = () => {
    setConfig(initialConfig);
    localStorage.removeItem(CONFIG_KEY);
    setMeta({ version: 0, updatedAt: 0 });
  };

  const register = async (email, password) => {
    setSyncStatus({ state: 'syncing', message: '注册中', lastSyncAt: syncStatus.lastSyncAt });
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        setSyncStatus({ state: 'error', message: '注册失败', lastSyncAt: syncStatus.lastSyncAt });
        return { ok: false };
      }
      const data = await res.json();
      setAuthToken(data.token || '');
      setAuthEmail(data.email || email);
      localStorage.setItem(AUTH_TOKEN_KEY, data.token || '');
      localStorage.setItem(AUTH_EMAIL_KEY, data.email || email);
      setSyncStatus({ state: 'idle', message: '已登录', lastSyncAt: syncStatus.lastSyncAt });
      await pullSettings();
      return { ok: true };
    } catch {
      setSyncStatus({ state: 'error', message: '网络异常', lastSyncAt: syncStatus.lastSyncAt });
      return { ok: false };
    }
  };

  const login = async (email, password) => {
    setSyncStatus({ state: 'syncing', message: '登录中', lastSyncAt: syncStatus.lastSyncAt });
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        setSyncStatus({ state: 'error', message: '登录失败', lastSyncAt: syncStatus.lastSyncAt });
        return { ok: false };
      }
      const data = await res.json();
      setAuthToken(data.token || '');
      setAuthEmail(data.email || email);
      localStorage.setItem(AUTH_TOKEN_KEY, data.token || '');
      localStorage.setItem(AUTH_EMAIL_KEY, data.email || email);
      setSyncStatus({ state: 'idle', message: '已登录', lastSyncAt: syncStatus.lastSyncAt });
      await pullSettings();
      return { ok: true };
    } catch {
      setSyncStatus({ state: 'error', message: '网络异常', lastSyncAt: syncStatus.lastSyncAt });
      return { ok: false };
    }
  };

  const logout = () => {
    setAuthToken('');
    setAuthEmail('');
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_EMAIL_KEY);
    setSyncStatus({ state: 'idle', message: '已退出', lastSyncAt: syncStatus.lastSyncAt });
  };

  const syncNow = useCallback(async () => {
    const pending = safeParse(localStorage.getItem(PENDING_KEY), null);
    if (pending && pending.settings) {
      await pushSettings(pending.settings, pending.updatedAt);
      return;
    }
    await pushSettings(latestConfigRef.current);
  }, [PENDING_KEY, pushSettings, safeParse]);

  useEffect(() => {
    if (!authToken) return;
    const timer = setTimeout(() => {
      pullSettings();
    }, 0);
    return () => clearTimeout(timer);
  }, [authToken, pullSettings]);

  useEffect(() => {
    const handleOnline = () => {
      syncNow();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncNow]);

  return (
    <ConfigContext.Provider
      value={{
        config,
        updateConfig,
        resetConfig,
        login,
        register,
        logout,
        syncNow,
        authToken,
        authEmail,
        syncStatus
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
