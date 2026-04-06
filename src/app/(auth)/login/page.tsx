'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

// 表单验证状态接口
interface FormState {
  email: { value: string; error: string; touched: boolean };
  password: { value: string; error: string; touched: boolean };
}

// 验证邮箱格式
const validateEmail = (email: string): string => {
  if (!email.trim()) {
    return '请输入邮箱地址';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '请输入有效的邮箱地址';
  }
  return '';
};

// 验证密码
const validatePassword = (password: string): string => {
  if (!password) {
    return '请输入密码';
  }
  if (password.length < 4) {
    return '密码长度不能少于4位';
  }
  return '';
};

// 登录表单组件
function LoginForm() {
  const [formState, setFormState] = useState<FormState>({
    email: { value: '', error: '', touched: false },
    password: { value: '', error: '', touched: false },
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    const redirect = searchParams.get('redirect') || '/workbench';
    router.replace(redirect);
  }, [authLoading, isAuthenticated, router, searchParams]);

  // 更新字段值并验证
  const updateField = (field: 'email' | 'password', value: string) => {
    setFormState(prev => {
      const error = field === 'email' ? validateEmail(value) : validatePassword(value);
      return {
        ...prev,
        [field]: { ...prev[field], value, error, touched: true }
      };
    });
    setError('');
  };

  // 验证整个表单
  const validateForm = (): boolean => {
    const emailError = validateEmail(formState.email.value);
    const passwordError = validatePassword(formState.password.value);

    setFormState(prev => ({
      email: { ...prev.email, error: emailError, touched: true },
      password: { ...prev.password, error: passwordError, touched: true },
    }));

    return !emailError && !passwordError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 先验证表单
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const loginSucceeded = await login(formState.email.value, formState.password.value);
      if (loginSucceeded) {
        // 登录成功后先跳到真实工作区入口，避免继续停留在公共登录页。
        const redirect = searchParams.get('redirect') || '/workbench';
        router.replace(redirect);
      } else {
        setError('用户名或密码错误');
      }
    } catch {
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取输入框状态样式
  const getInputState = (field: 'email' | 'password') => {
    const state = formState[field];
    if (!state.touched) return '';
    return state.error ? 'border-destructive focus-visible:ring-destructive' : 'border-green-500';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">邮箱 <span className="text-destructive">*</span></Label>
        <div className="relative">
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={formState.email.value}
            onChange={(e) => updateField('email', e.target.value)}
            className={getInputState('email')}
            aria-invalid={formState.email.touched && !!formState.email.error}
            aria-describedby="email-error"
          />
          {formState.email.touched && !formState.email.error && (
            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
        </div>
        {formState.email.touched && formState.email.error && (
          <p id="email-error" className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {formState.email.error}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">密码 <span className="text-destructive">*</span></Label>
        <div className="relative">
          <Input
            id="password"
            type="password"
            placeholder="请输入密码"
            value={formState.password.value}
            onChange={(e) => updateField('password', e.target.value)}
            className={getInputState('password')}
            aria-invalid={formState.password.touched && !!formState.password.error}
            aria-describedby="password-error"
          />
          {formState.password.touched && !formState.password.error && (
            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
        </div>
        {formState.password.touched && formState.password.error && (
          <p id="password-error" className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {formState.password.error}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            登录中...
          </>
        ) : (
          '登录'
        )}
      </Button>
    </form>
  );
}

// 加载占位组件
function LoginFormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-muted rounded" />
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-16" />
        <div className="h-10 bg-muted rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-12" />
        <div className="h-10 bg-muted rounded" />
      </div>
      <div className="h-10 bg-muted rounded" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">售</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">售前管理系统</CardTitle>
          <CardDescription className="text-center">请登录您的账户继续使用</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
