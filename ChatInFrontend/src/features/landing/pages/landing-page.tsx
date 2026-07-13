import Link from 'next/link';
import { ArrowRightIcon, LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function Home() {
  return <main className="landing-shell">
    <nav className="nav"><Link className="brand" href="/"><span>↗</span> ChatIn</Link><div><Link href="/login">Entrar</Link><Link className="nav-cta" href="/register">Criar conta</Link></div></nav>
    <section className="hero"><p className="eyebrow"><SparklesIcon /> CONVERSAS SEM RUÍDO</p><h1>Seu espaço para<br /><em>conectar de verdade.</em></h1><p className="hero-copy">ChatIn reúne pessoas, ideias e momentos em uma conversa simples, bonita e em tempo real.</p><div className="hero-actions"><Link className="primary-button" href="/register">Começar agora <ArrowRightIcon /></Link><Link className="text-button" href="/login">Já tenho uma conta</Link></div></section>
    <section className="preview" aria-label="Prévia da experiência ChatIn"><aside><div className="logo-mark">↗</div><i /><i /><i /><i /><i /><b>+</b></aside><div className="preview-main"><header><strong>Boas-vindas ao ChatIn</strong><span>● online</span></header><div className="message incoming"><small>Marina Costa</small><p>Que bom ter você aqui. Vamos criar algo incrível?</p></div><div className="message outgoing"><p>Com certeza. Estou pronto!</p></div><div className="typing"><span /><span /><span /></div><footer>Escreva uma mensagem... <ArrowRightIcon /></footer></div><div className="preview-side"><p>ONLINE AGORA</p><div className="person"><b>MC</b> Marina Costa <span /></div><div className="person"><b>JL</b> João Lima <span /></div><div className="person"><b>AS</b> Ana Souza <span /></div><div className="private"><LockClosedIcon /> Privado por padrão</div></div></section>
  </main>;
}
