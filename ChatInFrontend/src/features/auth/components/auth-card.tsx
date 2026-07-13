'use client';

import { ArrowRightIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authApi, saveAuthSession } from '../api/auth-api';

type Mode = 'login' | 'register' | 'recover' | 'reset';

export function AuthCard({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isRecover = mode === 'recover';
  const passwordChecks = [
    { label: 'No mínimo 8 caracteres', passed: password.length >= 8 },
    { label: 'Uma letra maiúscula', passed: /[A-Z]/.test(password) },
    { label: 'Uma letra minúscula', passed: /[a-z]/.test(password) },
    { label: 'Um número', passed: /[0-9]/.test(password) },
    { label: 'Um caractere especial...', passed: /[^A-Za-z0-9]/.test(password) },
    { label: 'Senhas iguais', passed: Boolean(password) && password === passwordConfirmation },
  ];
  const isRegisterPasswordValid = passwordChecks.every((check) => check.passed);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const data = new FormData(event.currentTarget);

    if (isRegister && !isRegisterPasswordValid) {
      setError('A senha ainda não atende todos os requisitos.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const result = await authApi.login(String(data.get('email')), String(data.get('password')));
        saveAuthSession(result);
        setMessage('Login realizado. Abrindo o chat...');
        router.push('/chat');
      } else if (isRegister) {
        const result = await authApi.register(
          String(data.get('name')),
          String(data.get('nickname')),
          String(data.get('email')),
          String(data.get('password')),
        );
        saveAuthSession(result);
        setMessage('Conta criada! Abrindo o chat...');
        router.push('/chat');
      } else if (isRecover) {
        await authApi.recoverPassword(String(data.get('email')));
        setMessage('Se o e-mail existir, enviaremos as instruções de recuperação.');
      } else {
        await authApi.resetPassword(String(data.get('token')), String(data.get('password')));
        setMessage('Senha redefinida. Você já pode entrar.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir a ação.');
    } finally {
      setLoading(false);
    }
  };

  const title = isLogin
    ? 'Bem-vindo de volta.'
    : isRegister
      ? 'Seu próximo chat começa aqui.'
      : isRecover
        ? 'Vamos recuperar seu acesso.'
        : 'Crie uma nova senha.';
  const subtitle = isLogin
    ? 'Entre para continuar suas conversas.'
    : isRegister
      ? 'Crie sua conta gratuita em poucos segundos.'
      : isRecover
        ? 'Informe seu e-mail e enviaremos um link seguro.'
        : 'Escolha uma senha forte para sua conta.';

  return (
    <main className="auth-page">
      <Link className="brand" href="/">
        <span>↗</span> ChatIn
      </Link>
      <section className="auth-card">
        <p className="eyebrow">{isLogin ? 'BOM TE VER' : 'CHATIN'}</p>
        <h1>{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        <form onSubmit={submit}>
          {isRegister && (
            <div className="name-grid">
              <label>
                Nome completo
                <input required name="name" autoComplete="name" placeholder="Como devemos te chamar?" />
              </label>
              <label>
                Apelido
                <input required name="nickname" autoComplete="nickname" placeholder="Ex: lluan" maxLength={32} />
              </label>
            </div>
          )}
          <label>
            E-mail
            <input required name="email" type="email" autoComplete="email" placeholder="voce@email.com" />
          </label>
          {!isRecover && (
            <label>
              Senha
              <div className="password-input">
                <input
                  required
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={8}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  placeholder="Mínimo de 8 caracteres"
                  value={isLogin ? undefined : password}
                  onChange={isLogin ? undefined : (event) => setPassword(event.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Mostrar senha">
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>
          )}
          {isRegister && (
            <>
              <label>
                Confirmar senha
                <input
                  required
                  name="passwordConfirmation"
                  type={showPassword ? 'text' : 'password'}
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Digite a senha novamente"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                />
              </label>
              <ul className="password-checklist" aria-label="Requisitos da senha">
                {passwordChecks.map((check) => (
                  <li key={check.label} className={check.passed ? 'passed' : ''}>
                    <span>{check.passed ? '✓' : '•'}</span> {check.label}
                  </li>
                ))}
              </ul>
            </>
          )}
          {mode === 'reset' && (
            <label>
              Token de recuperação
              <input required name="token" placeholder="Token recebido por e-mail" />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}
          <button className="primary-button submit" disabled={loading}>
            {loading ? 'Aguarde...' : isLogin ? 'Entrar' : isRegister ? 'Criar minha conta' : isRecover ? 'Enviar instruções' : 'Redefinir senha'} <ArrowRightIcon />
          </button>
        </form>
        {isLogin && (
          <>
            <Link className="forgot" href="/recover-password">
              Esqueci minha senha
            </Link>
            <p className="switch">
              Ainda não tem uma conta? <Link href="/register">Criar conta</Link>
            </p>
          </>
        )}
        {isRegister && (
          <p className="switch">
            Já faz parte? <Link href="/login">Entrar</Link>
          </p>
        )}
        {(isRecover || mode === 'reset') && (
          <p className="switch">
            <Link href="/login">Voltar para entrar</Link>
          </p>
        )}
      </section>
    </main>
  );
}
