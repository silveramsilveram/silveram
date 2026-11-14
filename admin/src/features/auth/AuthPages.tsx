import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useLogin, useLogout } from '@refinedev/core';
import { Alert, Button, Form, Input, Result, Space } from 'antd';
import { useEffect, useState } from 'react';
import { clearIdentityCache } from '@/providers/authProvider';
import { authApi } from '@/services/api';
import { ApiError } from '@/services/apiClient';

const RESEND_SECONDS = 60;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--navy)' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', color: 'var(--ivory)', marginBottom: 20 }}>
          <div className="display" style={{ fontSize: 52, lineHeight: 1 }}>Silveram</div>
          <div className="mono" style={{ letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--champagne)', fontSize: 13 }}>Admin</div>
        </div>
        <div className="sv-surface" style={{ padding: 28 }}>{children}</div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const { mutate: login, isPending: verifying } = useLogin();

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(address: string) {
    setSending(true);
    setError(null);
    try {
      await authApi.requestOtp(address);
      setEmail(address);
      setStep('code');
      setCooldown(RESEND_SECONDS);
    } catch (caught) {
      const api = caught instanceof ApiError ? caught : null;
      if (api?.status === 429) setCooldown((value) => value || RESEND_SECONDS);
      setError(api?.network ? 'Could not reach the server. Check your connection and try again.' : api?.message ?? 'Could not send the code.');
    } finally {
      setSending(false);
    }
  }

  function verify(code: string) {
    setError(null);
    login({ email, code }, {
      onSuccess: (result) => { if (!result.success) setError(result.error?.message ?? 'That code did not work.'); },
      onError: () => setError('Could not sign you in. Try again.'),
    });
  }

  return (
    <Shell>
      <h1 className="display" style={{ margin: '0 0 4px', fontSize: 32, color: 'var(--navy)' }}>Sign in</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {step === 'email' ? 'We will e-mail a one-time code to your administrator address.' : <>Enter the six-digit code sent to <strong>{email}</strong>.</>}
      </p>
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} role="alert" /> : null}
      {step === 'email' ? (
        <Form layout="vertical" onFinish={({ email: value }: { email: string }) => sendCode(value.trim().toLowerCase())} requiredMark={false}>
          <Form.Item label="Administrator e-mail" name="email" rules={[{ required: true, type: 'email', message: 'Enter a valid e-mail address.' }]}>
            <Input prefix={<MailOutlined />} autoComplete="username" inputMode="email" autoFocus size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={sending} disabled={cooldown > 0}>
            {cooldown > 0 ? `Wait ${cooldown}s` : 'Send code'}
          </Button>
        </Form>
      ) : (
        <Form layout="vertical" onFinish={({ code }: { code: string }) => verify(code)} requiredMark={false}>
          <Form.Item label="Verification code" name="code" rules={[{ required: true, pattern: /^\d{6}$/, message: 'Enter the 6-digit code.' }]}>
            <Input prefix={<LockOutlined />} autoComplete="one-time-code" inputMode="numeric" maxLength={6} autoFocus size="large" className="mono" />
          </Form.Item>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="primary" htmlType="submit" size="large" block loading={verifying}>Verify and sign in</Button>
            <Button block disabled={cooldown > 0} loading={sending} onClick={() => sendCode(email)}>
              {cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
            </Button>
            <Button type="link" block onClick={() => { setStep('email'); setError(null); }}>Use a different e-mail</Button>
          </Space>
        </Form>
      )}
    </Shell>
  );
}

export function AccessDeniedPage() {
  const { mutate: logout, isPending } = useLogout();
  return (
    <Shell>
      <Result
        status="403"
        title="Administrator access is required"
        subTitle="You are signed in, but this account is not on Silveram's administrator list. No store data has been loaded."
        extra={<Button type="primary" loading={isPending} onClick={() => logout()}>Sign out and use another account</Button>}
      />
    </Shell>
  );
}

export function UnavailablePage() {
  return (
    <Shell>
      <Result
        status="warning"
        title="The admin service is not reachable"
        subTitle="Your session was not checked because the server did not answer. This is usually temporary."
        extra={<Button type="primary" onClick={() => { clearIdentityCache(); window.location.assign('/'); }}>Try again</Button>}
      />
    </Shell>
  );
}

export function NotFoundPage() {
  return <Result status="404" title="Page not found" subTitle="That page does not exist in the admin." extra={<Button type="primary" href="/">Back to overview</Button>} />;
}
