import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { siteConfig as initialConfig } from '../config/siteConfig';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const CONFIG_KEY = 'wedding-site-config';
  const META_KEY = 'wedding-site-config-meta';
  const PENDING_KEY = 'wedding-site-config-pending';
  const CONFLICT_KEY = 'wedding-site-config-conflict';
  const AUTH_TOKEN_KEY = 'wedding-auth-token';
  const AUTH_EMAIL_KEY = 'wedding-auth-email';
  const resolveApiBase = () => {
    const envBase = import.meta.env.VITE_SETTINGS_API_BASE;
    if (envBase) return envBase;
    if (typeof window !== 'undefined' && window.location) {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:4000';
      }
    }
    return 'https://specialzcs.duckdns.org';
  };

  const API_BASE = resolveApiBase();
  const SOCKET_BASE = import.meta.env.VITE_SETTINGS_WS_BASE || API_BASE;

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
  const socketRef = useRef(null);
  const versionRef = useRef(0);

  useEffect(() => {
    latestConfigRef.current = config;
  }, [config]);

  const getMeta = useCallback(() => {
    const meta = safeParse(localStorage.getItem(META_KEY), { version: 0, updatedAt: 0 });
    versionRef.current = meta.version;
    return meta;
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

  const publicRequest = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    return response;
  }, [API_BASE]);

  const applyRemoteSettings = useCallback((settings, meta) => {
    if (settings) {
      setLocalConfig(settings);
      setMeta(meta);
      setSyncStatus({ state: 'idle', message: '已同步', lastSyncAt: meta.updatedAt || Date.now() });
    }
  }, [setLocalConfig, setMeta]);

  const pullSettings = useCallback(async (targetVersion) => {
    if (!authToken) return;
    if (!navigator.onLine) {
      setSyncStatus({ state: 'offline', message: '离线模式', lastSyncAt: syncStatus.lastSyncAt });
      return;
    }

    // If targetVersion is provided, check if we already have it
    if (targetVersion !== undefined && versionRef.current >= targetVersion) {
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

  const pullPublicSettings = useCallback(async (targetVersion) => {
    if (!navigator.onLine) {
      setSyncStatus({ state: 'offline', message: '离线模式', lastSyncAt: syncStatus.lastSyncAt });
      return;
    }
    if (targetVersion !== undefined && versionRef.current >= targetVersion) {
      return;
    }
    setSyncStatus({ state: 'syncing', message: '同步中', lastSyncAt: syncStatus.lastSyncAt });
    try {
      const res = await publicRequest('/public-settings', { method: 'GET' });
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
  }, [applyRemoteSettings, clearPending, publicRequest, syncStatus.lastSyncAt]);

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

  const pushPublicSettings = useCallback(async (settings, updatedAtOverride) => {
    if (!navigator.onLine) {
      setSyncStatus({ state: 'offline', message: '离线模式', lastSyncAt: syncStatus.lastSyncAt });
      setPending(settings, updatedAtOverride || Date.now());
      return;
    }
    const meta = getMeta();
    const updatedAt = updatedAtOverride || meta.updatedAt || Date.now();
    setSyncStatus({ state: 'syncing', message: '同步中', lastSyncAt: syncStatus.lastSyncAt });
    try {
      const res = await publicRequest('/public-settings', {
        method: 'PUT',
        body: JSON.stringify({
          settings,
          clientVersion: meta.version || 0,
          updatedAt
        })
      });
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
  }, [CONFLICT_KEY, applyRemoteSettings, clearPending, getMeta, publicRequest, setMeta, setPending, syncStatus.lastSyncAt]);

  const updateConfig = (newConfig) => {
    setLocalConfig(newConfig);
    const meta = getMeta();
    const nextMeta = { version: meta.version || 0, updatedAt: Date.now() };
    setMeta(nextMeta);
    setPending(newConfig, nextMeta.updatedAt);
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      if (authToken) {
        pushSettings(latestConfigRef.current, nextMeta.updatedAt);
        return;
      }
      pushPublicSettings(latestConfigRef.current, nextMeta.updatedAt);
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
    if (!authToken) {
      await pullPublicSettings();
      return;
    }
    const pending = safeParse(localStorage.getItem(PENDING_KEY), null);
    if (pending && pending.settings) {
      await pushSettings(pending.settings, pending.updatedAt);
      return;
    }
    await pushSettings(latestConfigRef.current);
  }, [PENDING_KEY, authToken, pullPublicSettings, pushSettings, safeParse]);

  useEffect(() => {
    const socket = io(SOCKET_BASE, {
      auth: authToken ? { token: authToken } : {},
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('settings_updated', (data) => {
      if (authToken) {
        pullSettings(data.version);
        return;
      }
      pullPublicSettings(data.version);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [authToken, pullPublicSettings, pullSettings, SOCKET_BASE]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (authToken) {
        pullSettings();
        return;
      }
      pullPublicSettings();
    }, 0);
    return () => clearTimeout(timer);
  }, [authToken, pullPublicSettings, pullSettings]);

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
