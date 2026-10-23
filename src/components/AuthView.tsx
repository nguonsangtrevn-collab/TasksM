import React, { useState } from 'react';
import {
  CheckSquare,
  Lock,
  User,
  Mail,
  ArrowRight,
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  RotateCw,
  ArrowLeft,
  Key,
} from 'lucide-react';
import { UserAccount } from '../types/task';

interface AuthViewProps {
  onLoginSuccess: (user: UserAccount, tasks: any[]) => void;
  isOnline: boolean;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess, isOnline }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Form States
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password Visibility Toggle States ("có thể xem mật khẩu")
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  // Forgot Password Flow States
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'result'>('request');
  const [forgotInput, setForgotInput] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [previewOtpCode, setPreviewOtpCode] = useState<string | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<string>('');
  const [showRevealedPassword, setShowRevealedPassword] = useState<boolean>(true);
  const [copiedPassword, setCopiedPassword] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Local Accounts Directory for offline fallback
  const getLocalUsers = (): UserAccount[] => {
    try {
      const saved = localStorage.getItem('taskmaster_local_accounts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  };

  const saveLocalUsers = (users: UserAccount[]) => {
    try {
      localStorage.setItem('taskmaster_local_accounts', JSON.stringify(users));
    } catch {}
  };

  // Password Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanInput = username.trim().toLowerCase();
    if (!cleanInput || !password) {
      setErrorMessage('Vui lòng nhập tên đăng nhập/email và mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      if (isOnline) {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanInput, password }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              const accountWithPass: UserAccount = {
                ...data.user,
                password,
              };

              const localUsers = getLocalUsers();
              const existingIdx = localUsers.findIndex(
                (u) => u.id === data.user.id || u.username.toLowerCase() === cleanInput
              );
              if (existingIdx >= 0) {
                localUsers[existingIdx] = accountWithPass;
              } else {
                localUsers.push(accountWithPass);
              }
              saveLocalUsers(localUsers);

              const serverTasks = Array.isArray(data.tasks) ? data.tasks : [];
              localStorage.setItem(`taskmaster_tasks_${data.user.id}`, JSON.stringify(serverTasks));

              onLoginSuccess(accountWithPass, serverTasks);
              return;
            }
          } else if (res.status === 401) {
            setErrorMessage('Mật khẩu không chính xác. Bạn có thể bấm "Quên mật khẩu?" để khôi phục.');
            return;
          } else if (res.status === 404) {
            const errData = await res.json().catch(() => ({}));
            setErrorMessage(
              errData.error ||
                'Tài khoản không tồn tại trên hệ thống hoặc đã tự động bị xóa do không hoạt động trong 3 ngày. Bạn có thể bấm "Đăng ký mới".'
            );
            return;
          } else {
            const errData = await res.json().catch(() => ({}));
            setErrorMessage(errData.error || 'Lỗi đăng nhập. Vui lòng thử lại.');
            return;
          }
        } catch {
          // Fall through to offline check
        }
      }

      // Offline fallback
      const localUsers = getLocalUsers();
      const user = localUsers.find(
        (u) => u.username.toLowerCase() === cleanInput || u.email.toLowerCase() === cleanInput
      );

      if (!user) {
        setErrorMessage(
          'Không tìm thấy tài khoản ngoại tuyến. Vui lòng kết nối mạng hoặc bấm "Đăng ký mới" để bắt đầu.'
        );
        return;
      }

      if (user.password && user.password !== password) {
        setErrorMessage('Mật khẩu không chính xác.');
        return;
      }

      let userTasks: any[] = [];
      try {
        const raw = localStorage.getItem(`taskmaster_tasks_${user.id}`);
        if (raw) userTasks = JSON.parse(raw);
      } catch {}

      onLoginSuccess(user, userTasks);
    } catch (err: any) {
      setErrorMessage('Lỗi đăng nhập: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Registration Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUser || !cleanEmail || !password) {
      setErrorMessage('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }

    if (cleanUser.length < 3) {
      setErrorMessage('Tên đăng nhập cần tối thiểu 3 ký tự.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu cần tối thiểu 6 ký tự để đảm bảo an toàn.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setIsLoading(true);

    try {
      if (isOnline) {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanUser, email: cleanEmail, password }),
          });

          const data = await res.json();
          if (res.ok && data.user) {
            const localUsers = getLocalUsers();
            localUsers.push({ ...data.user, password });
            saveLocalUsers(localUsers);
            localStorage.setItem(`taskmaster_tasks_${data.user.id}`, JSON.stringify([]));

            setSuccessMessage(
              'Đăng ký tài khoản mới thành công! Vui lòng đăng nhập bằng tài khoản vừa tạo.'
            );
            setMode('login');
            setPassword('');
            setConfirmPassword('');
            return;
          } else {
            setErrorMessage(data.error || 'Lỗi đăng ký tài khoản trên máy chủ.');
            return;
          }
        } catch {
          // Fall through to offline registration
        }
      }

      // Offline registration fallback
      const localUsers = getLocalUsers();
      const existing = localUsers.find((u) => u.username === cleanUser || u.email === cleanEmail);
      if (existing) {
        setErrorMessage('Tên đăng nhập hoặc email đã được sử dụng.');
        return;
      }

      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let syncCode = 'TM-';
      for (let i = 0; i < 4; i++) syncCode += chars.charAt(Math.floor(Math.random() * chars.length));

      const nowIso = new Date().toISOString();
      const newAccount: UserAccount = {
        id: newUserId,
        username: cleanUser,
        email: cleanEmail,
        password,
        isProfileCompleted: false,
        syncCode,
        profile: {
          displayName: username.trim(),
          role: '',
          units: ['Ban Thanh Niên', 'Chi hội 1'],
          birthDate: '1995-01-01',
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`,
          email: cleanEmail,
          phone: '',
          weeklyGoal: 3,
          notifications: {
            browserEnabled: true,
            soundEnabled: true,
            priorityReminders: true,
            overdueAlerts: true,
          },
          connectedAppsList: [],
        },
        createdAt: nowIso,
        lastActiveAt: nowIso,
        lastSyncedAt: nowIso,
      };

      localUsers.push(newAccount);
      saveLocalUsers(localUsers);
      localStorage.setItem(`taskmaster_tasks_${newUserId}`, JSON.stringify([]));

      setSuccessMessage('Đã đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // FORGOT PASSWORD WORKFLOW (GỬI MÃ XÁC NHẬN VỀ GMAIL & CÓ THỂ XEM MẬT KHẨU)
  // ---------------------------------------------------------------------------

  // Step 1: Send Verification Code to Gmail
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanInput = forgotInput.trim().toLowerCase();
    if (!cleanInput) {
      setErrorMessage('Vui lòng nhập tên đăng nhập hoặc địa chỉ Gmail của bạn.');
      return;
    }

    setIsLoading(true);

    try {
      if (isOnline) {
        const res = await fetch('/api/auth/forgot-password/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailOrUsername: cleanInput }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setMaskedEmail(data.maskedEmail || cleanInput);
          if (data.previewCode) {
            setPreviewOtpCode(data.previewCode);
          }
          setSuccessMessage(data.message || `Đã gửi mã xác nhận 6 số về Gmail: ${data.maskedEmail}`);
          setForgotStep('verify');
          return;
        } else {
          setErrorMessage(data.error || 'Không tìm thấy tài khoản tương ứng.');
          return;
        }
      }

      // Offline fallback for demo / offline accounts
      const localUsers = getLocalUsers();
      const user = localUsers.find(
        (u) => u.username.toLowerCase() === cleanInput || u.email.toLowerCase() === cleanInput
      );

      if (!user) {
        setErrorMessage('Không tìm thấy tài khoản trong danh mục ngoại tuyến.');
        return;
      }

      const mockCode = '849201';
      setMaskedEmail(user.email);
      setPreviewOtpCode(mockCode);
      setSuccessMessage(`Đã tạo mã xác thực gửi về ${user.email}`);
      setForgotStep('verify');
    } catch (err: any) {
      setErrorMessage('Lỗi gửi mã xác nhận: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify Code & Reveal Password ("có thể xem mật khẩu")
  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanInput = forgotInput.trim().toLowerCase();
    const cleanCode = verificationCode.trim();

    if (!cleanCode) {
      setErrorMessage('Vui lòng nhập mã xác nhận 6 số từ Gmail.');
      return;
    }

    setIsLoading(true);

    try {
      if (isOnline) {
        const res = await fetch('/api/auth/forgot-password/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailOrUsername: cleanInput, code: cleanCode }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setRevealedPassword(data.revealedPassword || '(Không có mật khẩu)');
          setSuccessMessage('Xác thực Gmail thành công! Bạn có thể xem mật khẩu hiện tại hoặc đặt mật khẩu mới.');
          setForgotStep('result');
          return;
        } else {
          setErrorMessage(data.error || 'Mã xác thực không chính xác.');
          return;
        }
      }

      // Offline fallback
      const localUsers = getLocalUsers();
      const user = localUsers.find(
        (u) => u.username.toLowerCase() === cleanInput || u.email.toLowerCase() === cleanInput
      );

      if (user && (cleanCode === previewOtpCode || cleanCode === '849201')) {
        setRevealedPassword(user.password || '');
        setSuccessMessage('Xác thực thành công!');
        setForgotStep('result');
      } else {
        setErrorMessage('Mã xác thực ngoại tuyến không hợp lệ.');
      }
    } catch (err: any) {
      setErrorMessage('Lỗi xác thực: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Optional Reset to New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới cần tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setIsLoading(true);

    try {
      const cleanInput = forgotInput.trim().toLowerCase();
      const cleanCode = verificationCode.trim();

      if (isOnline) {
        const res = await fetch('/api/auth/forgot-password/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailOrUsername: cleanInput,
            code: cleanCode,
            newPassword,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          // Update local accounts if exists
          const localUsers = getLocalUsers();
          const idx = localUsers.findIndex(
            (u) => u.username.toLowerCase() === cleanInput || u.email.toLowerCase() === cleanInput
          );
          if (idx >= 0) {
            localUsers[idx].password = newPassword;
            saveLocalUsers(localUsers);
          }

          setSuccessMessage('Đã cập nhật mật khẩu mới thành công! Vui lòng đăng nhập bằng mật khẩu mới.');
          setMode('login');
          setUsername(cleanInput);
          setPassword(newPassword);
          setForgotStep('request');
          return;
        } else {
          setErrorMessage(data.error || 'Lỗi đặt lại mật khẩu.');
          return;
        }
      }

      // Offline update
      const localUsers = getLocalUsers();
      const idx = localUsers.findIndex(
        (u) => u.username.toLowerCase() === cleanInput || u.email.toLowerCase() === cleanInput
      );
      if (idx >= 0) {
        localUsers[idx].password = newPassword;
        saveLocalUsers(localUsers);
      }

      setSuccessMessage('Đã cập nhật mật khẩu mới thành công!');
      setMode('login');
      setUsername(cleanInput);
      setPassword(newPassword);
      setForgotStep('request');
    } catch (err: any) {
      setErrorMessage('Lỗi: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy revealed password to clipboard
  const handleCopyRevealedPassword = () => {
    if (!revealedPassword) return;
    navigator.clipboard.writeText(revealedPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  // Switch directly to login using revealed password
  const handleUseRevealedPasswordToLogin = () => {
    setMode('login');
    setUsername(forgotInput);
    setPassword(revealedPassword);
    setForgotStep('request');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-['Be_Vietnam_Pro',sans-serif]">
      <div className="w-full max-w-md space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-blue-600 to-sky-400 text-white shadow-xl shadow-indigo-500/25 mb-1">
            <CheckSquare className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">TaskMaster</h1>
            <span className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-md shadow-xs">
              AI
            </span>
          </div>
          <p className="text-indigo-200/90 text-xs sm:text-sm max-w-xs mx-auto">
            Quản Lý &amp; Phân Rã Nhiệm Vụ Thông Minh • Cố Vấn Năng Suất
          </p>

          {/* Online/Offline Status Indicator */}
          <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px]">
            {isOnline ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-950/60 px-3 py-0.5 rounded-full border border-emerald-800/60">
                <Wifi className="w-3 h-3" /> Trực tuyến • Tự động đồng bộ đa thiết bị
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-300 font-semibold bg-amber-950/60 px-3 py-0.5 rounded-full border border-amber-800/60">
                <WifiOff className="w-3 h-3" /> Ngoại tuyến (Offline) • Lưu trữ trên thiết bị
              </span>
            )}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 text-slate-800 shadow-2xl border border-white/20 space-y-4">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* Login / Register Toggle Tabs (when not in forgot mode) */}
          {mode !== 'forgot' ? (
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                  mode === 'login' ? 'bg-white text-indigo-700 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đăng nhập tài khoản
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                  mode === 'register' ? 'bg-white text-indigo-700 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đăng ký mới
              </button>
            </div>
          ) : (
            /* Forgot Password Header Bar */
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setForgotStep('request');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại Đăng nhập</span>
              </button>
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>Khôi Phục Mật Khẩu</span>
              </span>
            </div>
          )}

          {/* 1. LOGIN / REGISTER FORM */}
          {mode !== 'forgot' && (
            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-3.5">
              {/* Username */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  {mode === 'login' ? 'Tên đăng nhập hoặc Email:' : 'Tên đăng nhập mới:'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={mode === 'login' ? 'canbo_quanly hoặc email@domain.com' : 'Ví dụ: canbo_chidoan'}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Email (only in Register mode) */}
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Địa chỉ Gmail / Email liên hệ: <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="canbo@gmail.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              )}

              {/* Password with Eye Toggle ("có thể xem mật khẩu") */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    Mật khẩu: <span className="text-rose-500">*</span>
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setForgotInput(username);
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setForgotStep('request');
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Quên mật khẩu?</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors p-0.5"
                    title={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password (only in Register mode, with Eye Toggle) */}
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Xác nhận lại mật khẩu: <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegisterConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden"
                    />
                    <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors p-0.5"
                      title={showRegisterConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showRegisterConfirmPassword ? (
                        <EyeOff className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xử lý dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Đăng nhập vào TaskMaster' : 'Đăng ký tài khoản mới'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. FORGOT PASSWORD FLOW (QUÊN MẬT KHẨU & GỬI MÃ GMAIL) */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              {/* Step 1: Input Gmail / Username to Request OTP */}
              {forgotStep === 'request' && (
                <form onSubmit={handleRequestResetCode} className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    Nhập <strong>Tên đăng nhập</strong> hoặc <strong>địa chỉ Gmail</strong> bạn đã đăng ký. Hệ thống sẽ gửi một mã xác nhận gồm 6 chữ số về hòm thư Gmail để bảo mật danh tính.
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Tên đăng nhập hoặc Gmail liên kết: <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={forgotInput}
                        onChange={(e) => setForgotInput(e.target.value)}
                        placeholder="canbo_quanly hoặc canbo@gmail.com"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !forgotInput.trim()}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang gửi mã xác thực về Gmail...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Gửi mã xác nhận về Gmail</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Step 2: Input 6-Digit OTP Code */}
              {forgotStep === 'verify' && (
                <form onSubmit={handleVerifyResetCode} className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 space-y-1.5 leading-relaxed">
                    <div className="font-bold flex items-center gap-1.5 text-indigo-900">
                      <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Đã gửi mã xác nhận 6 số về Gmail:</span>
                    </div>
                    <p className="font-mono font-bold text-indigo-800 text-xs">
                      {maskedEmail || forgotInput}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Vui lòng mở hộp thư Gmail của bạn (kiểm tra cả mục Hộp thư đến và Thư rác/Spam). Mã có hiệu lực trong 10 phút.
                    </p>
                  </div>

                  {/* Dev/Preview Code Helper Badge */}
                  {previewOtpCode && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between gap-2">
                      <span className="font-medium">Mã thử nghiệm nhanh:</span>
                      <span className="font-mono font-black text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md tracking-wider">
                        {previewOtpCode}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Nhập mã xác nhận (6 chữ số): <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full text-center tracking-[8px] font-mono text-lg font-black py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep('request')}
                      className="text-slate-500 hover:text-slate-800 cursor-pointer font-medium"
                    >
                      Đổi địa chỉ Gmail khác
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestResetCode}
                      disabled={isLoading}
                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Gửi lại mã</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || verificationCode.trim().length !== 6}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang kiểm tra mã xác nhận...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Xác nhận &amp; Xem mật khẩu</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Step 3: Verified Result ("có thể xem mật khẩu" & tùy chọn đặt mật khẩu mới) */}
              {forgotStep === 'result' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Verified Identity Badge */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-extrabold text-emerald-900">
                        Xác thực Gmail thành công!
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        Tài khoản: <strong>{forgotInput}</strong>
                      </div>
                    </div>
                  </div>

                  {/* SECTION A: CÓ THỂ XEM MẬT KHẨU HIỆN TẠI (REVEAL PASSWORD) */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Mật khẩu tài khoản của bạn:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowRevealedPassword(!showRevealedPassword)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        {showRevealedPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showRevealedPassword ? 'Ẩn' : 'Xem mật khẩu'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-300 font-mono text-sm sm:text-base font-bold text-slate-900 shadow-2xs">
                      <span className="truncate pr-2">
                        {showRevealedPassword ? revealedPassword : '••••••••••••'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleCopyRevealedPassword}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Sao chép mật khẩu"
                        >
                          {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedPassword ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleUseRevealedPasswordToLogin}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Đăng nhập ngay với mật khẩu này</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* SECTION B: HOẶC ĐỔI MẬT KHẨU MỚI (RESET PASSWORD) */}
                  <div className="pt-2 border-t border-slate-200 space-y-3">
                    <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider block">
                      Hoặc bạn muốn đặt lại mật khẩu mới:
                    </span>

                    <form onSubmit={handleResetPassword} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">
                          Mật khẩu mới (tối thiểu 6 ký tự): <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mật khẩu mới"
                            className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden"
                          />
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-2 text-slate-400 hover:text-indigo-600 cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4 text-indigo-600" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">
                          Xác nhận mật khẩu mới: <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmNewPassword ? 'text' : 'password'}
                            required
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder="Nhập lại mật khẩu mới"
                            className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-medium outline-hidden"
                          />
                          <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <button
                            type="button"
                            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                            className="absolute right-3 top-2 text-slate-400 hover:text-indigo-600 cursor-pointer"
                          >
                            {showConfirmNewPassword ? <EyeOff className="w-4 h-4 text-indigo-600" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || !newPassword || !confirmNewPassword}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>Cập nhật mật khẩu mới</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Multi-Device & 3-Day Inactivity Auto-Cleanup Policy Notice */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
            <div className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Chính sách đồng bộ &amp; tự động dọn dẹp tài khoản:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              <li>
                <strong>Đồng bộ xuyên suốt:</strong> Khi bạn đăng nhập trên điện thoại, máy tính hay trình duyệt khác, toàn bộ nhiệm vụ bạn đã làm trước đó sẽ hiển thị đầy đủ.
              </li>
              <li>
                <strong>Tự động xóa sau 3 ngày không sử dụng:</strong> Tài khoản nào không đăng nhập hoặc không hoạt động trong 3 ngày sẽ tự động được hệ thống xóa an toàn để bảo mật dữ liệu.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
