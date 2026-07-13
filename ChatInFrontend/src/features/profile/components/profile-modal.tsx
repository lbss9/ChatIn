'use client';

import {
  ArrowRightOnRectangleIcon,
  BoltIcon,
  CameraIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  EnvelopeIcon,
  FireIcon,
  HashtagIcon,
  HeartIcon,
  KeyIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  TrashIcon,
  TrophyIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { type FocusEvent, type FormEvent, type MouseEvent, type PointerEvent, useMemo, useRef, useState } from 'react';
import { profileApi, type UserProfile } from '../api/profile-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003/api';

function resolveAssetUrl(url?: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${API_URL.replace(/\/api$/, '')}${url}`;
}

function getInitial(value: string) {
  return value.trim()[0]?.toUpperCase() ?? 'U';
}

function normalizeBadge(badge: string | { code: string; awardedAt?: string | Date }) {
  return typeof badge === 'string' ? { code: badge, awardedAt: undefined } : badge;
}

function formatAwardedAt(value?: string | Date) {
  if (!value) return 'Data não registrada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não registrada';
  return `Conquistado em ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function parseCoverPosition(value: string) {
  const percent = value.match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  if (percent) {
    return { x: clampPercent(Number(percent[1])), y: clampPercent(Number(percent[2])) };
  }

  const parts = value.split(/\s+/);
  const xKeyword = parts.find((part) => ['left', 'center', 'right'].includes(part)) ?? 'center';
  const yKeyword = parts.find((part) => ['top', 'center', 'bottom'].includes(part)) ?? 'center';
  const x = xKeyword === 'left' ? 0 : xKeyword === 'right' ? 100 : 50;
  const y = yKeyword === 'top' ? 0 : yKeyword === 'bottom' ? 100 : 50;
  return { x, y };
}

function formatCoverPosition(x: number, y: number) {
  return `${clampPercent(x).toFixed(1)}% ${clampPercent(y).toFixed(1)}%`;
}

function getBadgeMeta(badge: string) {
  if (badge === '100 mensagens enviadas') {
    return { label: '100 mensagens enviadas', description: 'Enviou 100 mensagens', icon: <TrophyIcon />, tone: 'messages' };
  }
  if (badge === 'early-access') {
    return { label: 'Early access', description: 'Entrou antes do lançamento', icon: <CheckBadgeIcon />, tone: 'early' };
  }
  if (badge === 'fundador') {
    return { label: 'Fundador', description: 'Fundador do ChatIn', icon: <SparklesIcon />, tone: 'founder' };
  }
  if (badge === 'verificado') {
    return { label: 'Verificado', description: 'Conta verificada', icon: <CheckBadgeIcon />, tone: 'verified' };
  }
  if (badge === 'sequencia-7-dias') {
    return { label: 'Sequência de 7 dias', description: 'Usou o ChatIn por 7 dias seguidos', icon: <FireIcon />, tone: 'streak' };
  }
  if (badge === 'primeiro-chat') {
    return { label: 'Primeiro chat', description: 'Iniciou a primeira conversa', icon: <ChatBubbleLeftRightIcon />, tone: 'chat' };
  }
  if (badge === 'membro-popular') {
    return { label: 'Membro popular', description: 'Recebeu destaque da comunidade', icon: <StarIcon />, tone: 'popular' };
  }
  if (badge === 'criador-grupo') {
    return { label: 'Criador de grupo', description: 'Criou um grupo', icon: <UserGroupIcon />, tone: 'group' };
  }
  if (badge === 'perfil-completo') {
    return { label: 'Perfil completo', description: 'Completou o perfil', icon: <HashtagIcon />, tone: 'profile' };
  }
  if (badge === 'beta-tester') {
    return { label: 'Beta tester', description: 'Testou recursos em beta', icon: <BoltIcon />, tone: 'beta' };
  }
  if (badge === 'boas-vindas') {
    return { label: 'Boas-vindas', description: 'Completou uma missão', icon: <HeartIcon />, tone: 'welcome' };
  }
  if (badge === 'explorador') {
    return { label: 'Explorador', description: 'Explorou recursos do ChatIn', icon: <RocketLaunchIcon />, tone: 'explorer' };
  }
  if (badge === 'conta-segura') {
    return { label: 'Conta segura', description: 'Ativou boas práticas de segurança', icon: <ShieldCheckIcon />, tone: 'safe' };
  }
  return { label: badge, description: badge, icon: <CheckBadgeIcon />, tone: 'default' };
}

type ProfileModalProps = {
  user: UserProfile;
  onClose: () => void;
  onSaved: (user: UserProfile) => void;
  onLogout: () => void;
};

type BadgeTooltip = {
  label: string;
  description: string;
  awardedAt?: string | Date;
  left: number;
  top: number;
  placement: 'top' | 'bottom';
};

export default function ProfileModal({ user, onClose, onSaved, onLogout }: ProfileModalProps) {
  const [profile, setProfile] = useState(user);
  const [name, setName] = useState(user.name);
  const [nickname, setNickname] = useState(user.nickname ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [coverUrl, setCoverUrl] = useState(user.coverUrl ?? '');
  const [coverPosition, setCoverPosition] = useState(user.coverPosition ?? 'center center');
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);
  const [draftCoverUrl, setDraftCoverUrl] = useState(user.coverUrl ?? '');
  const [draftCoverPosition, setDraftCoverPosition] = useState(user.coverPosition ?? 'center center');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [newEmail, setNewEmail] = useState(user.email);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [panel, setPanel] = useState<'profile' | 'email' | 'password' | 'danger'>('profile');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [badgeTooltip, setBadgeTooltip] = useState<BadgeTooltip | null>(null);
  const coverDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [draggingCover, setDraggingCover] = useState(false);

  const coverPreview = useMemo(() => resolveAssetUrl(coverUrl), [coverUrl]);
  const draftCoverPreview = useMemo(() => resolveAssetUrl(draftCoverUrl), [draftCoverUrl]);
  const badges = profile.badges.map(normalizeBadge);

  const showResult = (ok: string) => {
    setError('');
    setMessage(ok);
  };

  const showError = (err: unknown) => {
    setMessage('');
    setError(err instanceof Error ? err.message : 'Não foi possível concluir a ação.');
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await profileApi.updateProfile({
        name: name.trim(),
        nickname: nickname.trim(),
        bio: bio.trim(),
        coverUrl: coverUrl.trim(),
        coverPosition,
      });
      setProfile(updated);
      onSaved(updated);
      showResult('Perfil atualizado.');
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  const openCoverEditor = () => {
    setDraftCoverUrl(coverUrl);
    setDraftCoverPosition(coverPosition);
    setCoverEditorOpen(true);
  };

  const uploadCover = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await profileApi.uploadImage(file);
      setDraftCoverUrl(result.url);
      showResult('Capa carregada.');
    } catch (err) {
      showError(err);
    } finally {
      setUploading(false);
    }
  };

  const saveCover = async () => {
    setSaving(true);
    try {
      const updated = await profileApi.updateProfile({
        name: name.trim(),
        nickname: nickname.trim(),
        bio: bio.trim(),
        coverUrl: draftCoverUrl.trim(),
        coverPosition: draftCoverPosition,
      });
      setCoverUrl(updated.coverUrl ?? '');
      setCoverPosition(updated.coverPosition ?? 'center center');
      setProfile(updated);
      onSaved(updated);
      setCoverEditorOpen(false);
      showResult('Capa atualizada.');
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  const startCoverDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!draftCoverPreview) return;
    const origin = parseCoverPosition(draftCoverPosition);
    coverDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingCover(true);
  };

  const moveCoverDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!coverDragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - coverDragRef.current.startX;
    const dy = event.clientY - coverDragRef.current.startY;
    const nextX = coverDragRef.current.originX - (dx / rect.width) * 100;
    const nextY = coverDragRef.current.originY - (dy / rect.height) * 100;
    setDraftCoverPosition(formatCoverPosition(nextX, nextY));
  };

  const stopCoverDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (coverDragRef.current) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }
    }
    coverDragRef.current = null;
    setDraggingCover(false);
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await profileApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      showResult('Senha alterada. Entre novamente nos outros dispositivos.');
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  const changeEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await profileApi.changeEmail({ email: newEmail.trim(), currentPassword: emailPassword });
      setProfile(updated);
      onSaved(updated);
      setEmailPassword('');
      showResult('E-mail alterado.');
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    setSaving(true);
    try {
      await profileApi.logout();
    } catch {
      // Local logout still wins if the network/session is already stale.
    } finally {
      setSaving(false);
      onLogout();
    }
  };

  const deleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await profileApi.deleteAccount({ currentPassword: deletePassword, confirmation: deleteConfirmation });
      onLogout();
    } catch (err) {
      showError(err);
      setSaving(false);
    }
  };

  const showBadgeTooltip = (
    event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>,
    meta: ReturnType<typeof getBadgeMeta>,
    awardedAt?: string | Date,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipWidth = 230;
    const tooltipHeight = 82;
    const padding = 12;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - tooltipWidth / 2, padding),
      window.innerWidth - tooltipWidth - padding,
    );
    const topPlacement = rect.top - tooltipHeight - 10;
    const placement: BadgeTooltip['placement'] = topPlacement < padding ? 'bottom' : 'top';
    setBadgeTooltip({
      label: meta.label,
      description: meta.description,
      awardedAt,
      left,
      top: placement === 'top' ? topPlacement : rect.bottom + 10,
      placement,
    });
  };

  return (
    <>
      <button className="profile-backdrop" type="button" aria-label="Fechar perfil" onClick={onClose} />
      <section className="profile-modal" role="dialog" aria-modal="true" aria-label="Editar perfil">
        <button type="button" className="profile-close" onClick={onClose} aria-label="Fechar"><XMarkIcon /></button>
        <div
          className="profile-hero"
          style={coverPreview ? {
            backgroundImage: `linear-gradient(180deg,#00000010,#000000a8), url("${coverPreview}")`,
            backgroundPosition: `center center, ${coverPosition}`,
          } : undefined}
        >
          <button type="button" className="profile-cover-button" onClick={openCoverEditor}>
            <CameraIcon />
            Editar capa
          </button>
          <div className="profile-avatar-large">{getInitial(profile.name)}</div>
        </div>

        <div className="profile-modal-body">
          <aside className="profile-summary">
            <span className="profile-label">Sua conta</span>
            <h2>{profile.name}</h2>
            <p>@{profile.nickname ?? 'sem-apelido'}</p>
            <div className="profile-badges">
              {badges.length ? badges.map((badge) => {
                const meta = getBadgeMeta(badge.code);
                return (
                  <span
                    key={`${badge.code}-${badge.awardedAt ?? 'legacy'}`}
                    className={`profile-badge badge-${meta.tone}`}
                    aria-label={`${meta.label}: ${meta.description}. ${formatAwardedAt(badge.awardedAt)}`}
                    tabIndex={0}
                    onMouseEnter={(event) => showBadgeTooltip(event, meta, badge.awardedAt)}
                    onMouseLeave={() => setBadgeTooltip(null)}
                    onFocus={(event) => showBadgeTooltip(event, meta, badge.awardedAt)}
                    onBlur={() => setBadgeTooltip(null)}
                  >
                    {meta.icon}
                  </span>
                );
              }) : null}
            </div>
            <div className="profile-email-readonly"><EnvelopeIcon /> {profile.email}</div>
            <nav className="profile-tabs" aria-label="Perfil">
              <button className={panel === 'profile' ? 'active' : ''} onClick={() => setPanel('profile')} type="button">Perfil</button>
              <button className={panel === 'email' ? 'active' : ''} onClick={() => setPanel('email')} type="button">E-mail</button>
              <button className={panel === 'password' ? 'active' : ''} onClick={() => setPanel('password')} type="button">Senha</button>
              <button className={panel === 'danger' ? 'danger active' : 'danger'} onClick={() => setPanel('danger')} type="button">Conta</button>
            </nav>
          </aside>

          <div className="profile-panel">
            {message && <p className="profile-success">{message}</p>}
            {error && <p className="profile-error">{error}</p>}

            {panel === 'profile' && (
              <form className="profile-form" onSubmit={saveProfile}>
                <label>Nome completo<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label>
                <label>Apelido<input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={32} required /></label>
                <label>Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={240} placeholder="Conte um pouco sobre você." /></label>
                <button className="profile-primary" disabled={saving || uploading}>{uploading ? 'Enviando capa...' : saving ? 'Salvando...' : 'Salvar perfil'}</button>
              </form>
            )}

            {panel === 'email' && (
              <form className="profile-form" onSubmit={changeEmail}>
                <div className="profile-security-title"><EnvelopeIcon /><span><strong>Alterar e-mail</strong><small>Confirmamos com sua senha atual antes de trocar.</small></span></div>
                <label>Novo e-mail<input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} required /></label>
                <label>Senha atual<input type="password" value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} minLength={8} required /></label>
                <button className="profile-primary" disabled={saving}>Atualizar e-mail</button>
              </form>
            )}

            {panel === 'password' && (
              <form className="profile-form" onSubmit={changePassword}>
                <div className="profile-security-title"><KeyIcon /><span><strong>Alterar senha</strong><small>Isso encerra sessões antigas para proteger a conta.</small></span></div>
                <label>Senha atual<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} minLength={8} required /></label>
                <label>Nova senha<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required /></label>
                <button className="profile-primary" disabled={saving}>Alterar senha</button>
              </form>
            )}

            {panel === 'danger' && (
              <div className="profile-danger-zone">
                <form className="profile-form" onSubmit={deleteAccount}>
                  <div className="profile-security-title danger"><TrashIcon /><span><strong>Excluir conta</strong><small>Digite EXCLUIR e confirme com sua senha.</small></span></div>
                  <label>Senha atual<input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} minLength={8} required /></label>
                  <label>Confirmação<input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="EXCLUIR" required /></label>
                  <button className="profile-danger-button" disabled={saving}><TrashIcon /> Excluir minha conta</button>
                </form>
              </div>
            )}

            <div className="profile-security-note"><ShieldCheckIcon /> Alterações sensíveis exigem autenticação e não expõem sua senha.</div>
            {panel === 'danger' && (
              <button type="button" className="profile-logout profile-logout-bottom" onClick={logout} disabled={saving}>
                <ArrowRightOnRectangleIcon /> Sair da conta
              </button>
            )}
          </div>
        </div>
      </section>
      {coverEditorOpen && (
        <>
          <button className="cover-editor-backdrop" type="button" aria-label="Fechar editor de capa" onClick={() => setCoverEditorOpen(false)} />
          <section className="cover-editor-modal" role="dialog" aria-modal="true" aria-label="Editar capa">
            <header>
              <div>
                <span>Capa</span>
                <strong>Editar imagem</strong>
              </div>
              <button type="button" onClick={() => setCoverEditorOpen(false)} aria-label="Fechar"><XMarkIcon /></button>
            </header>
            <div
              className={`cover-editor-preview${draggingCover ? ' dragging' : ''}${draftCoverPreview ? ' has-image' : ''}`}
              style={draftCoverPreview ? {
                backgroundImage: `linear-gradient(180deg,#00000010,#00000085), url("${draftCoverPreview}")`,
                backgroundPosition: `center center, ${draftCoverPosition}`,
              } : undefined}
              onPointerDown={startCoverDrag}
              onPointerMove={moveCoverDrag}
              onPointerUp={stopCoverDrag}
              onPointerCancel={stopCoverDrag}
            >
              <span>{draftCoverPreview ? 'Arraste para enquadrar' : 'Prévia da capa'}</span>
            </div>
            <div className="cover-editor-actions">
              <label>
                <CameraIcon />
                Trocar imagem
                <input type="file" accept="image/*" onChange={(event) => uploadCover(event.target.files?.[0])} />
              </label>
              <input value={draftCoverUrl} onChange={(event) => setDraftCoverUrl(event.target.value)} maxLength={500} placeholder="URL da capa" />
            </div>
            <div className="cover-position-field">
              <span>Enquadramento</span>
              <small>Clique e arraste a prévia para posicionar a imagem como quiser.</small>
              <button type="button" onClick={() => setDraftCoverPosition('center center')}>Centralizar</button>
            </div>
            <footer>
              <button type="button" className="cover-editor-secondary" onClick={() => setCoverEditorOpen(false)} disabled={saving || uploading}>Cancelar</button>
              <button type="button" className="cover-editor-primary" onClick={saveCover} disabled={saving || uploading}>{uploading ? 'Enviando...' : saving ? 'Salvando...' : 'Salvar capa'}</button>
            </footer>
          </section>
        </>
      )}
      {badgeTooltip && (
        <div
          className={`profile-badge-tooltip is-${badgeTooltip.placement}`}
          style={{ left: badgeTooltip.left, top: badgeTooltip.top }}
          role="tooltip"
        >
          <strong>{badgeTooltip.label}</strong>
          <small>{badgeTooltip.description}</small>
          <time>{formatAwardedAt(badgeTooltip.awardedAt)}</time>
        </div>
      )}
      <style jsx global>{`
        .profile-backdrop { position:fixed; inset:0; z-index:92; border:0; background:#000000b8; backdrop-filter:blur(5px); cursor:default; animation:tag-backdrop-in .18s ease; }
        .profile-modal { position:fixed; top:50%; left:50%; z-index:93; width:min(900px,calc(100vw - 32px)); height:min(820px,calc(100vh - 32px)); transform:translate(-50%,-50%); display:flex; flex-direction:column; border:1px solid #3a3f3d; border-radius:28px; background:#141716; color:#f6f7f2; box-shadow:0 34px 110px #000f,inset 0 1px 0 #ffffff08; overflow:hidden; animation:tag-modal-in .18s cubic-bezier(.34,1.4,.64,1); }
        .profile-close { position:absolute; top:16px; right:16px; z-index:2; display:grid; place-items:center; width:38px; height:38px; border:0; border-radius:50%; color:#d9dddb; background:#242827d9; cursor:pointer; transition:background .15s,transform .15s; }
        .profile-close:hover { background:#343a37; transform:rotate(5deg); }
        .profile-close svg { width:19px; }
        .profile-hero { position:relative; flex:none; min-height:210px; background:linear-gradient(135deg,#eaff8b42,#3f4b42 44%,#1a2324), radial-gradient(circle at 78% 18%,#eaff8b9a,transparent 28%); background-size:cover; background-position:center; }
        .profile-hero::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg,transparent 30%,#141716 100%); pointer-events:none; }
        .profile-cover-button { position:absolute; left:22px; top:20px; z-index:2; display:flex; align-items:center; gap:8px; width:max-content; padding:10px 13px; border:1px solid #ffffff1c; border-radius:999px; color:#f7f8f3; background:#121515c9; font-size:.8rem; font-weight:800; cursor:pointer; backdrop-filter:blur(12px); }
        .profile-cover-button svg { width:18px; color:var(--lime); }
        .profile-cover-button input { display:none; }
        .cover-editor-backdrop { position:fixed; inset:0; z-index:124; border:0; background:#00000072; backdrop-filter:blur(3px); cursor:default; }
        .cover-editor-modal { position:fixed; top:50%; left:50%; z-index:125; width:min(560px,calc(100vw - 32px)); transform:translate(-50%,-50%); display:grid; gap:16px; padding:18px; border:1px solid #3b403e; border-radius:22px; color:#f6f7f2; background:#151817; box-shadow:0 30px 90px #000e,inset 0 1px 0 #ffffff08; animation:tag-modal-in .18s cubic-bezier(.34,1.4,.64,1); }
        .cover-editor-modal header,.cover-editor-modal footer { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .cover-editor-modal header span { display:block; color:var(--lime); font-size:.66rem; font-weight:950; letter-spacing:.16em; text-transform:uppercase; }
        .cover-editor-modal header strong { display:block; margin-top:3px; font:900 1.12rem Manrope,sans-serif; }
        .cover-editor-modal header button { display:grid; place-items:center; width:34px; height:34px; border:0; border-radius:50%; color:#d9dddb; background:#242827; cursor:pointer; }
        .cover-editor-modal header svg { width:18px; }
        .cover-editor-preview { position:relative; display:grid; place-items:center; min-height:210px; border:1px solid #323735; border-radius:18px; color:#9fa7a4; background:linear-gradient(135deg,#eaff8b26,#303a34 50%,#1d2323); background-size:cover; background-position:center; overflow:hidden; user-select:none; touch-action:none; }
        .cover-editor-preview.has-image { cursor:grab; }
        .cover-editor-preview.dragging { cursor:grabbing; }
        .cover-editor-preview::after { content:""; position:absolute; inset:0; background:radial-gradient(circle at center,#0000 42%,#00000035); pointer-events:none; opacity:.7; }
        .cover-editor-preview span { position:relative; z-index:1; padding:9px 12px; border-radius:999px; color:#f7f8f3; background:#101312c9; font-size:.8rem; font-weight:900; box-shadow:0 12px 30px #0008; pointer-events:none; }
        .cover-editor-actions { display:grid; grid-template-columns:max-content minmax(0,1fr); gap:10px; align-items:center; }
        .cover-editor-actions label { display:flex; align-items:center; gap:8px; height:44px; padding:0 14px; border-radius:999px; color:#111312; background:var(--lime); font-size:.84rem; font-weight:950; cursor:pointer; }
        .cover-editor-actions label svg { width:18px; }
        .cover-editor-actions label input { display:none; }
        .cover-editor-actions>input { height:44px; padding:0 13px; border:1px solid #343a37; border-radius:14px; color:#f7f8f3; background:#1f2422; outline:none; }
        .cover-editor-actions>input:focus { border-color:var(--lime); box-shadow:0 0 0 3px #eaff8b15; }
        .cover-editor-modal .cover-position-field { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 12px; align-items:center; padding:12px; border:1px solid #2c312f; border-radius:16px; background:#1d211f; }
        .cover-editor-modal .cover-position-field span { color:#f0f3ef; font-size:.84rem; font-weight:950; }
        .cover-editor-modal .cover-position-field small { grid-column:1; color:#9fa7a4; font-size:.76rem; line-height:1.35; }
        .cover-editor-modal .cover-position-field button { grid-column:2; grid-row:1 / 3; height:36px; padding:0 12px; border:1px solid #3b403e; border-radius:999px; color:#dce1de; background:#252b28; cursor:pointer; font-weight:900; }
        .cover-editor-modal .cover-position-field button:hover { border-color:#eaff8b55; color:#f6f7f2; }
        .cover-editor-modal footer { padding-top:2px; }
        .cover-editor-secondary,.cover-editor-primary { height:44px; padding:0 18px; border:0; border-radius:999px; cursor:pointer; font-weight:950; }
        .cover-editor-secondary { color:#dce1de; background:#252b28; }
        .cover-editor-primary { color:#111312; background:var(--lime); }
        .cover-editor-secondary:disabled,.cover-editor-primary:disabled { opacity:.5; cursor:not-allowed; }
        .profile-avatar-large { position:absolute; left:34px; bottom:-42px; z-index:2; display:grid; place-items:center; width:96px; height:96px; border:6px solid #141716; border-radius:28px; color:#121414; background:linear-gradient(135deg,#ff906b,#eaff8b); font:900 2.2rem Manrope,sans-serif; box-shadow:0 22px 50px #000b; }
        .profile-modal-body { display:grid; grid-template-columns:280px minmax(0,1fr); gap:24px; flex:1; min-height:0; padding:58px 24px 24px; overflow:hidden; }
        .profile-summary { display:flex; flex-direction:column; gap:12px; min-width:0; }
        .profile-label { width:max-content; color:var(--lime); font-size:.68rem; font-weight:900; letter-spacing:.16em; text-transform:uppercase; }
        .profile-summary h2 { margin:0; font:900 1.45rem/1 Manrope,sans-serif; letter-spacing:-.03em; overflow:hidden; text-overflow:ellipsis; }
        .profile-summary p { margin:0; color:#aeb5b2; font-weight:800; }
        .profile-email-readonly { display:flex; align-items:center; gap:9px; min-width:0; padding:11px 12px; border:1px solid #2f3432; border-radius:14px; color:#c3cbc8; background:#1d211f; font-size:.82rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .profile-email-readonly svg { width:17px; color:#9da5a2; flex:none; }
        .profile-badges { display:flex; flex-wrap:wrap; align-items:center; gap:8px; min-height:26px; overflow:visible; }
        .profile-badge { position:relative; display:grid; place-items:center; width:24px; height:24px; border:1px solid #ffffff18; border-radius:9px; color:#101211; box-shadow:0 8px 18px #0006,inset 0 1px 0 #ffffff8a; transform:rotate(-3deg); transition:transform .15s,filter .15s; }
        .profile-badge:nth-child(even) { transform:rotate(3deg); }
        .profile-badge:hover { transform:translateY(-1px) rotate(0deg) scale(1.06); filter:saturate(1.12); }
        .profile-badge::before { content:""; position:absolute; inset:2px; border-radius:7px; background:linear-gradient(135deg,#ffffff52,transparent 45%); pointer-events:none; }
        .profile-badges .badge-messages { background:linear-gradient(135deg,#ff967b,#e85c4f); color:#1b0d0b; }
        .profile-badges .badge-early { background:linear-gradient(135deg,#f6ff9c,#b9f16b); color:#14200c; }
        .profile-badges .badge-founder { background:linear-gradient(135deg,#f4c7ff,#8a5cf6); color:#1a1027; }
        .profile-badges .badge-verified { background:linear-gradient(135deg,#75f5ff,#3ba3ff); color:#071923; }
        .profile-badges .badge-streak { background:linear-gradient(135deg,#ffcf70,#ff6e3a); color:#211006; }
        .profile-badges .badge-chat { background:linear-gradient(135deg,#9fffd7,#30cc91); color:#052017; }
        .profile-badges .badge-popular { background:linear-gradient(135deg,#fff39a,#ffbd2e); color:#211704; }
        .profile-badges .badge-group { background:linear-gradient(135deg,#d2e7ff,#7fa5ff); color:#10192c; }
        .profile-badges .badge-profile { background:linear-gradient(135deg,#d5f6ff,#8ea0a8); color:#10181b; }
        .profile-badges .badge-beta { background:linear-gradient(135deg,#d6c0ff,#6e5bff); color:#130f2d; }
        .profile-badges .badge-welcome { background:linear-gradient(135deg,#ffb7d5,#ff5d9b); color:#250916; }
        .profile-badges .badge-explorer { background:linear-gradient(135deg,#b7ffd8,#5da7ff); color:#071525; }
        .profile-badges .badge-safe { background:linear-gradient(135deg,#dfff99,#75d36d); color:#0b1e0a; }
        .profile-badges .badge-default { background:linear-gradient(135deg,#77d4ff,#8b7cf6); color:#101124; }
        .profile-badges svg { position:relative; z-index:1; width:14px; stroke-width:2.6; }
        .profile-badge-tooltip { position:fixed; z-index:120; display:flex; flex-direction:column; align-items:flex-start; gap:3px; width:230px; min-height:0; padding:9px 11px; border:1px solid #3b403e; border-radius:8px; color:#f4f7f2; background:#171a1af7; box-shadow:0 14px 34px #000d; pointer-events:none; text-align:left; animation:profile-tooltip-in .12s ease-out; }
        .profile-badge-tooltip::after { content:""; position:absolute; left:50%; width:8px; height:8px; border-right:1px solid #3b403e; border-bottom:1px solid #3b403e; background:#171a1a; }
        .profile-badge-tooltip.is-top::after { top:100%; transform:translate(-50%,-4px) rotate(45deg); }
        .profile-badge-tooltip.is-bottom::after { bottom:100%; transform:translate(-50%,4px) rotate(225deg); }
        .profile-badge-tooltip strong { display:block; width:100%; color:#f4f7f2; font-size:.78rem; line-height:1.15; white-space:nowrap; }
        .profile-badge-tooltip small { display:block; width:100%; color:#aeb5b2; font-size:.69rem; line-height:1.25; white-space:normal; }
        .profile-badge-tooltip time { display:block; width:100%; margin-top:2px; color:#eaff8b; font-size:.66rem; font-weight:800; line-height:1.2; white-space:nowrap; }
        @keyframes profile-tooltip-in { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .profile-tabs { display:grid; gap:8px; margin-top:8px; }
        .profile-tabs button { display:flex; align-items:center; justify-content:space-between; height:42px; padding:0 13px; border:1px solid #2d3230; border-radius:14px; color:#dce1de; background:#1e2220; cursor:pointer; font-weight:900; text-align:left; transition:background .15s,border-color .15s,color .15s; }
        .profile-tabs button:hover,.profile-tabs button.active { border-color:#eaff8b55; color:#f7f8f3; background:#252b28; }
        .profile-tabs button.danger.active { border-color:#ff8a7a66; color:#ffb6ad; }
        .profile-panel { min-width:0; min-height:0; overflow:auto; padding-right:4px; scrollbar-width:thin; scrollbar-color:#343a37 transparent; }
        .profile-panel:has(.profile-danger-zone) { display:flex; flex-direction:column; }
        .profile-panel::-webkit-scrollbar { width:6px; }
        .profile-panel::-webkit-scrollbar-thumb { border-radius:999px; background:#343a37; }
        .profile-form { display:grid; gap:14px; }
        .profile-form label { display:grid; gap:7px; color:#e8ecea; font-size:.83rem; font-weight:900; }
        .profile-form input,.profile-form textarea { width:100%; border:1px solid #343a37; border-radius:16px; color:#f7f8f3; background:#1f2422; box-shadow:none; outline:none; }
        .profile-form input { height:48px; padding:0 14px; }
        .profile-form textarea { min-height:110px; max-height:180px; resize:vertical; padding:14px; line-height:1.45; }
        .profile-form input:focus,.profile-form textarea:focus { border-color:var(--lime); box-shadow:0 0 0 3px #eaff8b15; }
        .profile-primary,.profile-danger-button,.profile-logout { display:flex; align-items:center; justify-content:center; gap:8px; height:48px; border:0; border-radius:999px; cursor:pointer; font-weight:950; }
        .profile-primary { color:#111312; background:var(--lime); box-shadow:0 16px 30px #eaff8b18; }
        .profile-primary:disabled,.profile-danger-button:disabled,.profile-logout:disabled { opacity:.5; cursor:not-allowed; }
        .profile-security-title { display:flex; align-items:center; gap:12px; padding:14px; border:1px solid #2f3432; border-radius:18px; background:#1d211f; }
        .profile-security-title svg { width:28px; color:var(--lime); flex:none; }
        .profile-security-title strong,.profile-security-title small { display:block; }
        .profile-security-title small { margin-top:3px; color:#9fa7a4; font-size:.78rem; font-weight:700; }
        .profile-success,.profile-error { margin:0 0 14px; padding:12px 14px; border-radius:14px; font-size:.84rem; font-weight:800; }
        .profile-success { color:#dfff95; background:#eaff8b14; }
        .profile-error { color:#ffb9b0; background:#ff6b5720; }
        .profile-security-note { display:flex; align-items:center; gap:8px; margin-top:16px; color:#8e9894; font-size:.78rem; font-weight:800; }
        .profile-security-note svg { width:17px; color:var(--lime); }
        .profile-danger-zone { display:grid; gap:18px; }
        .profile-logout { color:#f7f8f3; background:#252b28; }
        .profile-logout-bottom { margin-top:auto; flex:none; }
        .profile-logout svg,.profile-danger-button svg { width:19px; }
        .profile-danger-button { color:#fff1ef; background:#d95848; }
        .profile-security-title.danger svg { color:#ff8a7a; }
        @media (max-width:760px) { .profile-modal { height:min(760px,calc(100vh - 24px)); } .profile-modal-body { grid-template-columns:1fr; overflow:auto; padding-top:54px; } .profile-panel { overflow:visible; padding-right:0; } .profile-hero { min-height:170px; } .profile-avatar-large { width:82px; height:82px; border-radius:24px; font-size:1.9rem; } }
      `}</style>
    </>
  );
}
