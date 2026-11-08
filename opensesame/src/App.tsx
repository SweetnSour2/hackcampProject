import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import worldAtlas from "world-atlas/countries-110m.json";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Code2,
  Command,
  Compass,
  ExternalLink,
  GitBranch as Github,
  GitFork,
  Globe2,
  Home,
  KeyRound,
  Layers3,
  LayoutList,
  Menu,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Star,
  TerminalSquare,
  UserRound,
  X,
} from "lucide-react";
import { languages, repositories as demoRepos, topics, type Repository } from "./data";
import {
  fetchCoach,
  fetchMatches,
  githubUsername,
  toRepository,
  type Skill,
} from "./api";

const worldTopology = worldAtlas as unknown as Topology;
const worldCountries = (
  feature(worldTopology, worldTopology.objects.countries) as unknown as {
    features: object[];
  }
).features;

function useElementSize(
  elementRef: React.RefObject<HTMLElement | null>,
  fallback: { width: number; height: number },
) {
  const [size, setSize] = useState(fallback);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let animationFrame = 0;
    const updateSize = (width: number, height: number) => {
      const nextWidth = Math.max(1, Math.round(width));
      const nextHeight = Math.max(1, Math.round(height));
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        setSize((current) =>
          current.width === nextWidth && current.height === nextHeight
            ? current
            : { width: nextWidth, height: nextHeight },
        );
      });
    };

    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        updateSize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    observer.observe(element);
    const bounds = element.getBoundingClientRect();
    updateSize(bounds.width, bounds.height);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [elementRef]);

  return size;
}

function configureGlobe(globe: GlobeMethods, autoRotate: boolean) {
  const controls = globe.controls();
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.45;
  controls.zoomSpeed = 0.65;
  controls.minDistance = 112;
  controls.maxDistance = 390;
  controls.autoRotate =
    autoRotate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  controls.autoRotateSpeed = 0.28;

  // Capping pixel density prevents high-DPI displays from overwhelming the
  // WebGL render loop while preserving a crisp globe.
  globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
}

type Page =
  | "landing"
  | "onboarding"
  | "home"
  | "explore"
  | "matches"
  | "contribute"
  | "saved"
  | "profile"
  | "detail";
type DetailTab = "Overview" | "Why It Matches" | "Open Issues" | "Contributors";

const nav = [
  { id: "home" as Page, label: "Home", icon: Home },
  { id: "explore" as Page, label: "Explore", icon: Compass },
  { id: "matches" as Page, label: "Matches", icon: CircleDot },
  { id: "contribute" as Page, label: "Contribute", icon: Code2 },
  { id: "saved" as Page, label: "Saved", icon: Bookmark },
  { id: "profile" as Page, label: "Profile", icon: UserRound },
];

const fallbackAvatar = "https://avatars.githubusercontent.com/u/583231?v=4";

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo-lockup">
      <span className="logo-mark">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path className="logo-door-frame" d="M4.75 20.25V3.75h10.5v16.5" />
          <path className="logo-open-door" d="M8.25 20.25V6.4l9.5 1.85v12" />
          <circle className="logo-keyhole" cx="14.15" cy="13.15" r="1.15" />
          <path className="logo-threshold" d="M3.5 20.25h17" />
        </svg>
      </span>
      {!compact && <span className="logo-type">OpenSesame</span>}
    </div>
  );
}

function Avatar({
  size = "md",
  src = fallbackAvatar,
}: {
  size?: "sm" | "md" | "lg";
  src?: string;
}) {
  return (
    <img className={`avatar avatar-${size}`} src={src} alt="GitHub profile avatar" />
  );
}

function Button({
  children,
  variant = "primary",
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}

function Landing({
  onLogin,
  onExplore,
  authError,
}: {
  onLogin: () => void;
  onExplore: () => void;
  authError?: string;
}) {
  return (
    <main className="landing">
      <header className="landing-nav">
        <Logo />
        <div className="landing-links">
          <button onClick={onExplore}>Explore projects</button>
          <button>How it works</button>
        </div>
        <Button onClick={onLogin}>
          <Github size={16} /> Connect GitHub
        </Button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> Open-source discovery, rethought
          </div>
          <h1>
            Find your place
            <br />
            in <span>open source.</span>
          </h1>
          <p>
            Discover repositories that match your skills, understand where you can contribute, and
            turn your experience into impact.
          </p>
          <div className="hero-actions">
            {authError && <p className="hero-note">{authError}</p>}
            <Button onClick={onLogin}>
              <Github size={18} /> Connect GitHub <ArrowRight size={16} />
            </Button>
            <Button variant="secondary" onClick={onExplore}>
              <Globe2 size={17} /> Explore projects
            </Button>
          </div>
          <p className="hero-note">
            <Check size={14} /> No permissions beyond your public GitHub profile
          </p>
        </div>
        <HeroGlobe />
      </section>

      <section className="benefits">
        {[
          [
            "01",
            "Discover compatible repositories.",
            "Explore open-source work mapped to your technical profile.",
          ],
          [
            "02",
            "Understand why they match.",
            "See transparent compatibility across skills and interests.",
          ],
          [
            "03",
            "Find your next contribution.",
            "Move from discovery to a practical first step with confidence.",
          ],
        ].map(([num, title, copy]) => (
          <article key={num}>
            <span>{num}</span>
            <div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
            <ArrowRight size={16} />
          </article>
        ))}
      </section>
    </main>
  );
}

function HeroGlobe() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(containerRef, { width: 680, height: 680 });
  const material = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: "#07181b",
        emissive: "#041012",
        shininess: 7,
        specular: new THREE.Color("#163e3d"),
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  return (
    <div
      ref={containerRef}
      className="hero-visual"
      aria-label="Interactive repository globe preview"
    >
      <div className="globe-halo" />
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={material}
        showAtmosphere
        atmosphereColor="#30BFA0"
        atmosphereAltitude={0.13}
        polygonsData={worldCountries}
        polygonCapColor={() => "rgba(32, 77, 76, .78)"}
        polygonSideColor={() => "rgba(6, 20, 22, .2)"}
        polygonStrokeColor={() => "rgba(84, 159, 143, .2)"}
        polygonAltitude={0.006}
        polygonsTransitionDuration={0}
        ringsData={[demoRepos[0]]}
        ringLat="lat"
        ringLng="lng"
        ringColor={() => (time: number) => `rgba(100, 240, 189, ${(1 - time) * 0.7})`}
        ringMaxRadius={4.2}
        ringPropagationSpeed={0.7}
        ringRepeatPeriod={1700}
        enablePointerInteraction={false}
        onGlobeReady={() => {
          if (!globeRef.current) return;
          configureGlobe(globeRef.current, true);
          globeRef.current.pointOfView({ lat: 22, lng: 18, altitude: 1.9 }, 0);
        }}
      />
      <div className="floating-repo">
        <span className="repo-icon">
          <Box size={17} />
        </span>
        <div>
          <strong>calcom/cal.com</strong>
          <small>96% compatibility</small>
        </div>
        <span className="live-pulse" />
      </div>
      <div className="visual-caption">
        <Command size={14} /> Repositories, mapped by maintainers
      </div>
    </div>
  );
}

function Onboarding({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(["JavaScript", "React", "TypeScript"]);
  const toggle = (value: string) =>
    setSelected((s) => (s.includes(value) ? s.filter((x) => x !== value) : [...s, value]));
  return (
    <main className="onboarding">
      <div className="onboarding-top">
        <Logo />
        <span>Demo onboarding</span>
      </div>
      <section className="onboarding-card">
        <div className="step-row">
          <span>PROFILE SETUP</span>
          <span>0{step} / 03</span>
        </div>
        <div className="progress-track">
          <i style={{ width: `${step * 33.33}%` }} />
        </div>
        {step === 1 && (
          <>
            <div className="onboarding-icon">
              <Code2 size={22} />
            </div>
            <h1>What do you build with?</h1>
            <p>Select the languages and frameworks you feel comfortable contributing with.</p>
            <div className="chip-grid">
              {[
                "JavaScript",
                "TypeScript",
                "React",
                "Python",
                "Go",
                "Rust",
                "Vue",
                "Node.js",
                "Java",
                "C++",
              ].map((x) => (
                <button
                  key={x}
                  onClick={() => toggle(x)}
                  className={selected.includes(x) ? "selected" : ""}
                >
                  {selected.includes(x) && <Check size={14} />}
                  {x}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="onboarding-icon">
              <Layers3 size={22} />
            </div>
            <h1>What interests you?</h1>
            <p>Choose a few areas. These help us prioritize relevant project categories.</p>
            <div className="chip-grid">
              {[
                "Developer tools",
                "Web platforms",
                "AI & data",
                "Accessibility",
                "Infrastructure",
                "Education",
                "Security",
                "Design systems",
              ].map((x, i) => (
                <button
                  key={x}
                  onClick={() => toggle(x)}
                  className={selected.includes(x) || i < 2 ? "selected" : ""}
                >
                  {x}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <div className="onboarding-icon">
              <SlidersHorizontal size={22} />
            </div>
            <h1>How do you want to contribute?</h1>
            <p>Set a starting preference. You can update these details from your profile.</p>
            <label className="form-label">EXPERIENCE LEVEL</label>
            <div className="segmented">
              <button>New contributor</button>
              <button className="active">Some experience</button>
              <button>Experienced</button>
            </div>
            <label className="form-label">WEEKLY AVAILABILITY</label>
            <div className="segmented">
              <button>1–2 hours</button>
              <button className="active">3–5 hours</button>
              <button>6+ hours</button>
            </div>
          </>
        )}
        <div className="onboarding-actions">
          <Button variant="ghost" onClick={step === 1 ? onBack : () => setStep(step - 1)}>
            <ArrowLeft size={16} /> Back
          </Button>
          <Button onClick={step === 3 ? onComplete : () => setStep(step + 1)}>
            {step === 3 ? "Build my matches" : "Continue"} <ArrowRight size={16} />
          </Button>
        </div>
      </section>
      <p className="onboarding-foot">Your preferences are stored locally in demo mode.</p>
    </main>
  );
}

function Sidebar({
  page,
  collapsed,
  setCollapsed,
  navigate,
  username,
  avatar,
  matchCount,
  onLogout,
}: {
  page: Page;
  collapsed: boolean;
  setCollapsed: (x: boolean) => void;
  navigate: (p: Page) => void;
  username: string;
  avatar: string;
  matchCount: number;
  onLogout: () => void;
}) {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-head">
        <Logo compact={collapsed} />
        <button aria-label="Collapse sidebar" onClick={() => setCollapsed(!collapsed)}>
          <ChevronLeft size={17} />
        </button>
      </div>
      <nav>
        <span className="nav-label">{!collapsed && "WORKSPACE"}</span>
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={page === id || (page === "detail" && id === "matches") ? "active" : ""}
            onClick={() => navigate(id)}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} />
            {!collapsed && <span>{label}</span>}
            {id === "matches" && !collapsed && <i>{matchCount}</i>}
          </button>
        ))}
      </nav>
      <div className="sidebar-profile">
        <Avatar src={avatar} />
        {!collapsed && (
          <div>
            <strong>{username}</strong>
            <span>Connected</span>
          </div>
        )}
        {!collapsed && (
          <button aria-label="Log out" onClick={onLogout}>
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </aside>
  );
}

function Topbar({
  page,
  navigate,
  avatar,
}: {
  page: Page;
  navigate: (p: Page) => void;
  avatar: string;
}) {
  const title = page === "detail" ? "Repository" : page.charAt(0).toUpperCase() + page.slice(1);
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button onClick={() => navigate("home")}>OpenSesame</button>
        <ChevronRight size={13} />
        <span>{title}</span>
      </div>
      <div className="global-search">
        <Search size={16} />
        <input
          aria-label="Global repository search"
          placeholder="Search repositories, languages, topics..."
        />
        <kbd>⌘ K</kbd>
      </div>
      <div className="top-actions">
        <span className="github-status">
          <span /> GitHub connected
        </span>
        <button aria-label="Settings">
          <Settings2 size={17} />
        </button>
        <Avatar size="sm" src={avatar} />
      </div>
    </header>
  );
}

function Shell({
  children,
  page,
  navigate,
  username,
  avatar,
  matchCount,
  onLogout,
}: {
  children: React.ReactNode;
  page: Page;
  navigate: (p: Page) => void;
  username: string;
  avatar: string;
  matchCount: number;
  onLogout: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        navigate={navigate}
        username={username}
        avatar={avatar}
        matchCount={matchCount}
        onLogout={onLogout}
      />
      <div className="app-column">
        <Topbar page={page} navigate={navigate} avatar={avatar} />
        {children}
      </div>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <span className="section-label">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {children && <div className="header-actions">{children}</div>}
    </div>
  );
}

function FilterSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (x: string) => void;
}) {
  return (
    <label className="filter-select">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown size={14} />
    </label>
  );
}

function Explore({
  repos,
  selected,
  selectRepo,
  openDetail,
}: {
  repos: Repository[];
  selected: Repository;
  selectRepo: (r: Repository) => void;
  openDetail: (r: Repository) => void;
}) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cameraTimerRef = useRef<number | null>(null);
  const size = useElementSize(wrapRef, { width: 760, height: 620 });
  const [globeReady, setGlobeReady] = useState(false);
  const [language, setLanguage] = useState("All languages");
  const [topic, setTopic] = useState("All topics");
  const [view, setView] = useState<"globe" | "list">("globe");
  const material = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: "#07181b",
        emissive: "#030d0f",
        shininess: 8,
        specular: new THREE.Color("#17413f"),
      }),
    [],
  );
  const filtered = repos.filter(
    (r) =>
      (language === "All languages" || r.language === language) &&
      (topic === "All topics" || r.topic === topic),
  );
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    if (!globeReady) return;
    const globe = globeRef.current;
    if (!globe) return;

    if (cameraTimerRef.current) window.clearTimeout(cameraTimerRef.current);
    const controls = globe.controls();
    controls.enabled = false;
    globe.pointOfView({ lat: selected.lat, lng: selected.lng, altitude: 1.3 }, 1250);
    cameraTimerRef.current = window.setTimeout(() => {
      controls.enabled = true;
      cameraTimerRef.current = null;
    }, 1280);

    return () => {
      if (cameraTimerRef.current) window.clearTimeout(cameraTimerRef.current);
      controls.enabled = true;
    };
  }, [globeReady, selected]);

  const reset = () => globeRef.current?.pointOfView({ lat: 20, lng: 10, altitude: 2.15 }, 800);

  return (
    <main className="explore-page">
      <div className="explore-heading">
        <div>
          <span className="section-label">LIVE DISCOVERY</span>
          <h1>Explore open source</h1>
          <p>Repository locations use public maintainer or organization profiles.</p>
        </div>
        <div className="view-toggle">
          <button className={view === "globe" ? "active" : ""} onClick={() => setView("globe")}>
            <Globe2 size={15} /> Globe
          </button>
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
            <LayoutList size={15} /> List
          </button>
        </div>
      </div>
      <div className="explore-filters">
        <div className="filter-search">
          <Search size={16} />
          <input placeholder="Search the map..." />
        </div>
        <FilterSelect value={language} options={languages} onChange={setLanguage} />
        <FilterSelect value={topic} options={topics} onChange={setTopic} />
        <FilterSelect
          value="Any difficulty"
          options={["Any difficulty", "Beginner", "Intermediate", "Advanced"]}
          onChange={() => {}}
        />
        <FilterSelect
          value="Compatibility"
          options={["Compatibility", "90% and above", "80% and above"]}
          onChange={() => {}}
        />
        <button className="filter-button">
          <SlidersHorizontal size={15} /> More filters
        </button>
      </div>
      <div className="explore-workspace">
        <section className="globe-panel" ref={wrapRef}>
          {view === "globe" ? (
            <>
              <div className="globe-canvas">
                <Globe
                  ref={globeRef}
                  width={size.width}
                  height={size.height}
                  backgroundColor="rgba(0,0,0,0)"
                  globeMaterial={material}
                  showAtmosphere
                  atmosphereColor="#3bc7a8"
                  atmosphereAltitude={0.12}
                  polygonsData={worldCountries}
                  polygonCapColor={() => "rgba(30, 72, 72, .82)"}
                  polygonSideColor={() => "rgba(5, 18, 20, .18)"}
                  polygonStrokeColor={() => "rgba(92, 157, 145, .18)"}
                  polygonAltitude={0.006}
                  polygonsTransitionDuration={0}
                  ringsData={[selected]}
                  ringLat="lat"
                  ringLng="lng"
                  ringColor={() => (time: number) => `rgba(100, 240, 189, ${(1 - time) * 0.82})`}
                  ringMaxRadius={4.6}
                  ringPropagationSpeed={0.72}
                  ringRepeatPeriod={1550}
                  onGlobeReady={() => {
                    if (!globeRef.current) return;
                    configureGlobe(globeRef.current, false);
                    globeRef.current.pointOfView(
                      { lat: selected.lat, lng: selected.lng, altitude: 1.3 },
                      0,
                    );
                    setGlobeReady(true);
                  }}
                />
              </div>
              <div className="map-legend">
                <span>
                  <i className="high" /> Selected project origin
                </span>
                <span>
                  <CircleDot size={10} /> Public profile location
                </span>
              </div>
              <div className="map-tools">
                <button onClick={reset} title="Reset globe">
                  <RotateCcw size={16} />
                </button>
                <button onClick={() => globeRef.current?.pointOfView({ altitude: 1.4 }, 400)}>
                  +
                </button>
                <button onClick={() => globeRef.current?.pointOfView({ altitude: 2.5 }, 400)}>
                  −
                </button>
              </div>
              <div className="demo-map-note">
                <CircleDot size={13} /> Location data source shown in repository details
              </div>
              <div className="map-focus-card" key={selected.id}>
                <span className="map-focus-icon">
                  <Globe2 size={15} />
                </span>
                <div>
                  <small>VIEWING PROJECT ORIGIN</small>
                  <strong>{selected.location}</strong>
                  <span>
                    {selected.owner}/{selected.name} · {selected.locationSource}
                  </span>
                </div>
                <b className="map-coordinates">
                  {Math.abs(selected.lat).toFixed(2)}°{selected.lat >= 0 ? "N" : "S"}
                  <br />
                  {Math.abs(selected.lng).toFixed(2)}°{selected.lng >= 0 ? "E" : "W"}
                </b>
              </div>
            </>
          ) : (
            <RepositoryList
              repos={filtered}
              selected={selected}
              onSelect={selectRepo}
              onOpen={openDetail}
            />
          )}
        </section>
        <RecommendedPanel
          repos={filtered}
          selected={selected}
          onSelect={selectRepo}
          onOpen={openDetail}
        />
      </div>
    </main>
  );
}

function RecommendedPanel({
  repos,
  selected,
  onSelect,
  onOpen,
}: {
  repos: Repository[];
  selected: Repository;
  onSelect: (r: Repository) => void;
  onOpen: (r: Repository) => void;
}) {
  return (
    <aside className="recommend-panel">
      <div className="recommend-head">
        <div>
          <span className="section-label">CURATED MATCHES</span>
          <h2>Recommended for You</h2>
        </div>
        <button>
          <SlidersHorizontal size={16} />
        </button>
      </div>
      <p className="recommend-count">{repos.length} repositories based on your profile</p>
      <div className="recommend-list">
        {repos.map((r, i) => (
          <button
            key={r.id}
            className={`recommend-card ${selected.id === r.id ? "selected" : ""}`}
            onClick={() => onSelect(r)}
          >
            <div className="rank">0{i + 1}</div>
            <div className="repo-card-content">
              <div className="repo-card-top">
                <span className="repo-icon">
                  <Box size={16} />
                </span>
                <div>
                  <strong>{r.name}</strong>
                  <small>{r.owner}</small>
                </div>
                <span className={`match match-${r.match > 90 ? "high" : "mid"}`}>{r.match}%</span>
              </div>
              <p>{r.description}</p>
              <div className="repo-meta">
                <span>
                  <i style={{ background: r.color }} /> {r.language}
                </span>
                <span>{r.difficulty}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(r);
                  }}
                  aria-label={`Open ${r.name}`}
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </button>
        ))}
      </div>
      <button className="view-all">
        View all matches <ArrowRight size={14} />
      </button>
    </aside>
  );
}

function MatchBar({ value }: { value: number }) {
  return (
    <div className="match-bar">
      <i style={{ width: `${value}%` }} />
    </div>
  );
}

function RepositoryList({
  repos,
  selected,
  onSelect,
  onOpen,
  saved,
  toggleSave,
}: {
  repos: Repository[];
  selected?: Repository;
  onSelect?: (r: Repository) => void;
  onOpen: (r: Repository) => void;
  saved?: string[];
  toggleSave?: (id: string) => void;
}) {
  return (
    <div className="repo-table">
      {repos.map((r) => (
        <article
          key={r.id}
          className={`repo-row ${selected?.id === r.id ? "selected" : ""}`}
          onClick={() => onSelect?.(r)}
        >
          <span className="repo-icon large">
            <Box size={19} />
          </span>
          <div className="repo-main">
            <div className="repo-title">
              <strong>
                {r.owner}/<b>{r.name}</b>
              </strong>
              <span className="language">
                <i style={{ background: r.color }} />
                {r.language}
              </span>
              <span className="difficulty">{r.difficulty}</span>
            </div>
            <p>{r.description}</p>
            <div className="why-line">
              <Command size={13} />
              <span>{r.why}</span>
            </div>
          </div>
          <div className="repo-stats">
            <div>
              <strong>{r.match}%</strong>
              <span>match</span>
            </div>
            <MatchBar value={r.match} />
          </div>
          <div className="row-actions">
            {toggleSave && (
              <button
                className={saved?.includes(r.id) ? "saved" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSave(r.id);
                }}
                aria-label="Save repository"
              >
                {saved?.includes(r.id) ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
              </button>
            )}
            <Button variant="secondary" onClick={() => onOpen(r)}>
              View details
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function HomePage({
  navigate,
  openDetail,
  repos,
  username,
  avatar,
  skills,
  loading,
  error,
}: {
  navigate: (p: Page) => void;
  openDetail: (r: Repository) => void;
  repos: Repository[];
  username: string;
  avatar: string;
  skills: Skill[];
  loading: boolean;
  error: string | null;
}) {
  const top = repos[0];
  return (
    <main className="content-page">
      <PageHeader
        eyebrow="DEVELOPER COMMAND CENTER"
        title={`Good morning, ${username}.`}
        copy={
          loading
            ? "Reading your GitHub profile and scoring the catalog…"
            : error
              ? error
              : `Your open-source radar found ${repos.length} projects aligned with your profile.`
        }
      >
        <Button onClick={() => navigate("explore")}>
          <Globe2 size={16} /> Open discovery map
        </Button>
      </PageHeader>
      <div className="metric-grid">
        {[
          [
            top ? `${top.match}%` : "—",
            "Top compatibility",
            top ? `${top.owner}/${top.name}` : "Waiting on matches",
            KeyRound,
          ],
          [String(repos.length), "Fresh matches", loading ? "Loading" : "From your GitHub skills", Compass],
          ["—", "Saved projects", "Ready to revisit", Bookmark],
          [
            String(repos.filter((r) => r.difficulty === "Beginner").length || repos.length),
            "Contribution ready",
            "Beginner-friendly",
            CheckCircle2,
          ],
        ].map(([value, label, meta, Icon]) => (
          <article className="metric-card" key={label as string}>
            <div>
              <span>{label as string}</span>
              <strong>{value as string}</strong>
              <small>{meta as string}</small>
            </div>
            <i>
              <Icon size={18} />
            </i>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="dashboard-section">
          <div className="section-head">
            <div>
              <span className="section-label">TOP MATCHES</span>
              <h2>Built for your stack</h2>
            </div>
            <button onClick={() => navigate("matches")}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <RepositoryList repos={repos.slice(0, 3)} onOpen={openDetail} />
        </section>
        <aside className="profile-snapshot">
          <span className="section-label">YOUR PROFILE</span>
          <div className="snapshot-user">
            <Avatar size="lg" src={avatar} />
            <div>
              <h3>{username}</h3>
              <p>@{username}</p>
            </div>
            <span>{top ? `${top.match}%` : "—"}</span>
          </div>
          <p className="inferred">
            <Command size={14} /> Inferred from public GitHub activity
          </p>
          <h4>Primary stack</h4>
          <div className="tag-row">
            {(skills.length ? skills.slice(0, 6).map((s) => s.name) : ["—"]).map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          <h4>Interests</h4>
          <div className="tag-row muted">
            {["Developer tools", "Accessibility", "Web"].map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          <Button variant="secondary" onClick={() => navigate("profile")}>
            Review profile <ArrowRight size={14} />
          </Button>
        </aside>
      </div>
    </main>
  );
}

function Matches({
  repos,
  saved,
  toggleSave,
  openDetail,
}: {
  repos: Repository[];
  saved: string[];
  toggleSave: (id: string) => void;
  openDetail: (r: Repository) => void;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("Compatibility");
  const filtered = repos
    .filter((r) =>
      `${r.name} ${r.owner} ${r.language}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Popularity" ? parseFloat(b.stars) - parseFloat(a.stars) : b.match - a.match,
    );
  return (
    <main className="content-page">
      <PageHeader
        eyebrow="PERSONALIZED DISCOVERY"
        title="Your matches"
        copy="Transparent recommendations based on your selected skills, interests, and experience."
      />
      <div className="list-toolbar">
        <div className="filter-search wide">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your matches..."
          />
        </div>
        <FilterSelect value="All languages" options={languages} onChange={() => {}} />
        <FilterSelect
          value="All levels"
          options={["All levels", "Beginner", "Intermediate", "Advanced"]}
          onChange={() => {}}
        />
        <span className="toolbar-spacer" />
        <span className="sort-label">SORT BY</span>
        <FilterSelect
          value={sort}
          options={["Compatibility", "Activity", "Difficulty", "Popularity"]}
          onChange={setSort}
        />
      </div>
      <div className="list-context">
        <span>{filtered.length} repositories</span>
        <span>
          <CircleDot size={12} /> Scores from skill fit, beginner issues, recency
        </span>
      </div>
      <RepositoryList repos={filtered} onOpen={openDetail} saved={saved} toggleSave={toggleSave} />
    </main>
  );
}

function SavedPage({
  repos,
  saved,
  toggleSave,
  openDetail,
}: {
  repos: Repository[];
  saved: string[];
  toggleSave: (id: string) => void;
  openDetail: (r: Repository) => void;
}) {
  const list = repos.filter((r) => saved.includes(r.id));
  return (
    <main className="content-page">
      <PageHeader
        eyebrow="YOUR LIBRARY"
        title="Saved repositories"
        copy="Keep promising projects close and revisit them when you are ready to contribute."
      />
      <div className="list-toolbar">
        <div className="filter-search wide">
          <Search size={16} />
          <input placeholder="Search saved projects..." />
        </div>
        <FilterSelect
          value="Recently saved"
          options={["Recently saved", "Compatibility", "Popularity"]}
          onChange={() => {}}
        />
      </div>
      {list.length ? (
        <RepositoryList repos={list} onOpen={openDetail} saved={saved} toggleSave={toggleSave} />
      ) : (
        <div className="empty-state">
          <Bookmark size={26} />
          <h2>No saved repositories</h2>
          <p>Save a match to keep it in your personal library.</p>
        </div>
      )}
    </main>
  );
}

function ScoreRing({ value }: { value: number }) {
  const activeCells = Math.round(value / 4);
  return (
    <div
      className="compatibility-field"
      role="img"
      aria-label={`${value}% compatibility`}
      style={{ "--field-value": `${value}%` } as React.CSSProperties}
    >
      <div className="compatibility-cells" aria-hidden="true">
        {Array.from({ length: 25 }, (_, index) => (
          <i
            key={index}
            className={index < activeCells ? "active" : ""}
            style={{ "--cell-index": index } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="compatibility-value">
        <strong>{value}%</strong>
        <span>MATCH SIGNAL</span>
      </div>
    </div>
  );
}

function SignalStrip({ value }: { value: number }) {
  const activeSegments = Math.round(value / 10);
  return (
    <div className="signal-strip" aria-label={`${value}%`}>
      {Array.from({ length: 10 }, (_, index) => (
        <i key={index} className={index < activeSegments ? "active" : ""} />
      ))}
    </div>
  );
}

function DetailPage({
  repo,
  saved,
  toggleSave,
  navigate,
}: {
  repo: Repository;
  saved: string[];
  toggleSave: (id: string) => void;
  navigate: (p: Page) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("Overview");
  return (
    <main className="detail-page">
      <button className="back-link" onClick={() => navigate("matches")}>
        <ArrowLeft size={15} /> Back to matches
      </button>
      <section className="repo-detail-head">
        <div className="repo-logo">
          <Box size={28} />
        </div>
        <div className="detail-title">
          <div>
            <span>{repo.owner}</span>
            <h1>{repo.name}</h1>
          </div>
          <p>{repo.description}</p>
          <div className="detail-meta">
            <span>
              <Star size={14} /> {repo.stars}
            </span>
            <span>
              <GitFork size={14} /> {repo.forks}
            </span>
            <span>
              <i style={{ background: repo.color }} /> {repo.language}
            </span>
            <span className="activity">
              <i /> {repo.activity}
            </span>
          </div>
        </div>
        <div className="detail-actions">
          <button
            className={`save-button ${saved.includes(repo.id) ? "saved" : ""}`}
            onClick={() => toggleSave(repo.id)}
          >
            {saved.includes(repo.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{" "}
            {saved.includes(repo.id) ? "Saved" : "Save"}
          </button>
          <a className="btn btn-primary" href={repo.github} target="_blank" rel="noreferrer">
            <Github size={16} /> View on GitHub <ExternalLink size={13} />
          </a>
        </div>
      </section>
      <nav className="detail-tabs">
        {(["Overview", "Why It Matches", "Open Issues", "Contributors"] as DetailTab[]).map((x) => (
          <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>
            {x}
            {x === "Open Issues" && <span>{repo.issues.length}</span>}
          </button>
        ))}
      </nav>
      {tab === "Overview" && <OverviewTab repo={repo} onIssues={() => setTab("Open Issues")} />}
      {tab === "Why It Matches" && <WhyTab repo={repo} />}
      {tab === "Open Issues" && <IssuesTab repo={repo} navigate={navigate} />}
      {tab === "Contributors" && <ContributorsTab repo={repo} />}
    </main>
  );
}

function OverviewTab({ repo, onIssues }: { repo: Repository; onIssues: () => void }) {
  return (
    <div className="detail-content two-columns">
      <article className="doc-card">
        <span className="section-label">PROJECT OVERVIEW</span>
        <h2>What this project does</h2>
        <p className="lead">{repo.summary}</p>
        <h3>Why it matters</h3>
        <p>
          Open infrastructure gives teams more control over the tools that underpin important
          product workflows, while keeping the ecosystem extensible.
        </p>
        <h3>Key technologies</h3>
        <div className="tech-list">
          {repo.skills.concat(repo.learn).map((x, i) => (
            <span key={x} className={i < repo.skills.length ? "known" : ""}>
              <Code2 size={14} />
              {x}
            </span>
          ))}
        </div>
        <div className="ai-note">
          <TerminalSquare size={16} />
          <div>
            <strong>Demo-generated project summary</strong>
            <p>
              This summary is illustrative. Connect the production summarization backend to replace
              it with current repository context.
            </p>
          </div>
        </div>
      </article>
      <aside className="about-card">
        <span className="section-label">REPOSITORY SIGNALS</span>
        <dl>
          <div>
            <dt>Primary language</dt>
            <dd>{repo.language}</dd>
          </div>
          <div>
            <dt>Difficulty</dt>
            <dd>{repo.difficulty}</dd>
          </div>
          <div>
            <dt>Recent activity</dt>
            <dd className="mint">{repo.activity}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{repo.location}</dd>
          </div>
          <div>
            <dt>Location source</dt>
            <dd>{repo.locationSource}</dd>
          </div>
        </dl>
        <Button onClick={onIssues}>
          Explore open issues <ArrowRight size={15} />
        </Button>
      </aside>
    </div>
  );
}

function WhyTab({ repo }: { repo: Repository }) {
  const breakdown = [
    ["Technical skills", 94],
    ["Project interests", 91],
    ["Experience fit", 83],
    ["Contribution preference", 88],
  ];
  return (
    <div className="detail-content match-layout">
      <section className="compat-card">
        <div className="score-wrap">
          <ScoreRing value={repo.match} />
          <div>
            <span className="section-label">OVERALL COMPATIBILITY</span>
            <h2>An excellent fit for your profile</h2>
            <p>{repo.why}</p>
          </div>
        </div>
        <div className="breakdown">
          {breakdown.map(([label, score]) => (
            <div key={label as string}>
              <span>
                {label as string}
                <b>{score}%</b>
              </span>
              <SignalStrip value={score as number} />
            </div>
          ))}
        </div>
        <div className="explanation">
          <CircleDot size={16} />
          <p>
            <b>Why we recommended this:</b> Your public profile and selected preferences show strong
            overlap with this repository’s primary frontend stack. Experience fit and learning
            estimates are inferred, not verified GitHub data.
          </p>
        </div>
      </section>
      <aside className="skill-card">
        <span className="section-label">SKILL ALIGNMENT</span>
        <h3>You already know</h3>
        {repo.skills.map((x) => (
          <div className="skill-line known" key={x}>
            <CheckCircle2 size={16} />
            <span>{x}</span>
            <small>Profile match</small>
          </div>
        ))}
        <h3>Opportunity to learn</h3>
        {repo.learn.map((x) => (
          <div className="skill-line learn" key={x}>
            <CircleDot size={16} />
            <span>{x}</span>
            <small>Inferred</small>
          </div>
        ))}
      </aside>
    </div>
  );
}

function IssuesTab({ repo, navigate }: { repo: Repository; navigate: (p: Page) => void }) {
  return (
    <div className="detail-content issue-layout">
      <section>
        <div className="section-head">
          <div>
            <span className="section-label">CONTRIBUTION OPPORTUNITIES</span>
            <h2>Relevant open issues</h2>
          </div>
          <span className="demo-badge">Demo issue data</span>
        </div>
        <div className="issues-list">
          {repo.issues.map((issue, i) => (
            <article className="issue-card" key={issue.number}>
              <div className="issue-num">#{issue.number}</div>
              <div className="issue-main">
                {i === 0 && (
                  <span className="best-first">
                    <KeyRound size={12} /> BEST FIRST ISSUE
                  </span>
                )}
                <h3>{issue.title}</h3>
                <p>{issue.summary}</p>
                <div className="label-row">
                  {issue.labels.map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
                <div className="issue-skills">
                  {issue.skills.map((x) => (
                    <span key={x}>
                      <Code2 size={12} />
                      {x}
                    </span>
                  ))}
                </div>
              </div>
              <div className="issue-side">
                <span>{issue.difficulty}</span>
                <Button variant="secondary" onClick={() => navigate("contribute")}>
                  Check readiness <ArrowRight size={14} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ContributorsTab({ repo }: { repo: Repository }) {
  return (
    <div className="detail-content">
      <div className="data-disclaimer">
        <Github size={18} />
        <div>
          <strong>Contributor data requires GitHub API access</strong>
          <p>
            Connect the production GitHub integration to show verified avatars and contribution
            counts for {repo.owner}/{repo.name}. OpenSesame does not invent contributor statistics.
          </p>
        </div>
        <a href={`${repo.github}/graphs/contributors`} target="_blank" rel="noreferrer">
          View on GitHub <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

function ContributePage({
  repo,
  username,
}: {
  repo: Repository;
  username: string;
}) {
  const [done, setDone] = useState([0]);
  const [walkthrough, setWalkthrough] = useState<string | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const issue = repo.issues[0];
  const liveRepo = /^\d+$/.test(repo.id);
  useEffect(() => {
    if (!issue || !username || !liveRepo) return;
    let cancelled = false;
    setCoachLoading(true);
    setCoachError(null);
    fetchCoach({
      username,
      repo_full_name: `${repo.owner}/${repo.name}`,
      issue_number: issue.number,
    })
      .then((data) => {
        if (!cancelled) setWalkthrough(data.walkthrough_md);
      })
      .catch((err: Error) => {
        if (!cancelled) setCoachError(err.message);
      })
      .finally(() => {
        if (!cancelled) setCoachLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username, liveRepo, repo.owner, repo.name, issue?.number]);
  const steps = walkthrough
    ? walkthrough
        .split(/^## /m)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => {
          const newline = block.indexOf("\n");
          const title = (newline === -1 ? block : block.slice(0, newline)).trim();
          const copy = newline === -1 ? "" : block.slice(newline + 1).trim();
          return [title, copy] as [string, string];
        })
    : [
        [
          "Understand the issue",
          "Review the expected behavior, acceptance criteria, and related discussion.",
        ],
        [
          "Read contribution guidelines",
          `Open ${repo.owner}/${repo.name}’s contribution guide before changing code.`,
        ],
        [
          "Set up the repository",
          "Fork, clone, install dependencies, and verify the local test suite.",
        ],
        [
          "Implement the contribution",
          "Keep the change focused and add coverage for affected behavior.",
        ],
        ["Submit a pull request", "Explain the approach, testing, and any tradeoffs clearly."],
      ];
  const toggle = (i: number) =>
    setDone((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  if (!issue) {
    return (
      <main className="content-page contribute-page">
        <PageHeader
          eyebrow="CONTRIBUTION WORKSPACE"
          title="Pick a match first"
          copy="Open a repository from Matches, then come back here for the walkthrough."
        />
      </main>
    );
  }
  return (
    <main className="content-page contribute-page">
      <PageHeader
        eyebrow="CONTRIBUTION WORKSPACE"
        title="Prepare with confidence"
        copy={
          coachLoading
            ? "Reading the issue and docs…"
            : coachError
              ? coachError
              : "A practical path from understanding the issue to opening a focused pull request."
        }
      >
        <a
          className="btn btn-primary"
          href={`${repo.github}/issues/${issue.number}`}
          target="_blank"
          rel="noreferrer"
        >
          Open issue on GitHub <ExternalLink size={14} />
        </a>
      </PageHeader>
      <div className="contribution-grid">
        <section>
          <div className="selected-issue">
            <span className="repo-icon large">
              <Box size={19} />
            </span>
            <div>
              <small>
                {repo.owner}/{repo.name} · #{issue.number}
              </small>
              <h2>{issue.title}</h2>
              <p>{issue.summary}</p>
            </div>
            <span className="difficulty">{issue.difficulty}</span>
          </div>
          <div className="readiness">
            <div className="readiness-head">
              <div>
                <span className="section-label">CONTRIBUTION READINESS</span>
                <h2>Your skills vs. this issue</h2>
              </div>
              <div className="ready-score">
                <strong>Good fit</strong>
                <span>Inferred assessment</span>
              </div>
            </div>
            <div className="skill-compare">
              <div>
                <h3>Your Skills</h3>
                {(repo.skills.length ? repo.skills : ["Your stack"]).map((x) => (
                  <span className="matched" key={x}>
                    <Check size={14} />
                    {x}
                  </span>
                ))}
              </div>
              <div>
                <h3>Required Skills</h3>
                {issue.skills.map((x) => (
                  <span className={x === "React" ? "matched" : "gap"} key={x}>
                    {x === "React" ? <Check size={14} /> : <CircleDot size={14} />}
                    {x}
                  </span>
                ))}
                <span className="gap">
                  <CircleDot size={14} />
                  Testing conventions
                </span>
              </div>
            </div>
            <p className="readiness-copy">{repo.why}</p>
          </div>
        </section>
        <aside className="steps-card">
          <span className="section-label">
            {walkthrough ? "COACH WALKTHROUGH" : "SUGGESTED NEXT STEPS"}
          </span>
          <div className="steps-list">
            {steps.map(([title, copy], i) => (
              <button
                key={title}
                onClick={() => toggle(i)}
                className={done.includes(i) ? "done" : ""}
              >
                <span>{done.includes(i) ? <Check size={14} /> : i + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{copy}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="verification-note">
            <CircleDot size={14} /> Preparation checkmarks are personal. GitHub contribution status
            is only verified from GitHub data.
          </div>
        </aside>
      </div>
    </main>
  );
}

function ProfilePage({
  username,
  avatar,
  skills,
}: {
  username: string;
  avatar: string;
  skills: Skill[];
}) {
  return (
    <main className="content-page">
      <PageHeader
        eyebrow="DEVELOPER PROFILE"
        title="Your contribution profile"
        copy="Review the signals used to personalize repository recommendations."
      >
        <Button variant="secondary">
          <Settings2 size={16} /> Edit profile
        </Button>
      </PageHeader>
      <div className="profile-grid">
        <section className="profile-main-card">
          <div className="profile-identity">
            <Avatar size="lg" src={avatar} />
            <div>
              <h2>{username}</h2>
              <p>@{username}</p>
            </div>
            <span className="github-status">
              <span /> GitHub connected
            </span>
          </div>
          <p className="bio">Skills inferred from public GitHub repos. Not edited by you.</p>
          <div className="profile-divider" />
          <span className="section-label">SKILL ANALYSIS</span>
          <p className="summary-copy">
            {skills.length
              ? skills.map((s) => `${s.name} (${s.proficiency}/5): ${s.description}`).join(" ")
              : "Sign in to analyze your GitHub profile."}
          </p>
        </section>
        <aside className="profile-details">
          <span className="section-label">PREFERENCES</span>
          <h3>Programming languages</h3>
          <div className="tag-row">
            {(skills.length ? skills.map((s) => s.name) : ["—"]).map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          <h3>Technical interests</h3>
          <div className="tag-row muted">
            {["Developer tools", "Accessibility", "Web platforms"].map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          <dl>
            <div>
              <dt>Experience</dt>
              <dd>Some experience</dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>3–5 hours / week</dd>
            </div>
            <div>
              <dt>Contribution types</dt>
              <dd>Code, Documentation</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
}

export default function App() {
  const {
    isLoading,
    isAuthenticated,
    error,
    loginWithRedirect,
    logout,
    user,
  } = useAuth0();
  const [page, setPage] = useState<Page>("landing");
  const [repos, setRepos] = useState<Repository[]>(demoRepos);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<Repository>(demoRepos[0]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("opensesame-saved") || "[]");
    } catch {
      return [];
    }
  });
  const githubName = githubUsername(user);
  const username = githubName || user?.name || "guest";
  const avatar = user?.picture || fallbackAvatar;

  useEffect(() => {
    localStorage.setItem("opensesame-saved", JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    if (isAuthenticated && page === "landing") setPage("home");
  }, [isAuthenticated, page]);

  useEffect(() => {
    if (!isAuthenticated || !githubName) return;
    let cancelled = false;
    setMatchesLoading(true);
    setLoadError(null);
    fetchMatches(githubName)
      .then((data) => {
        if (cancelled) return;
        const mapped = data.matches.map(toRepository);
        setRepos(mapped.length ? mapped : demoRepos);
        setSkills(data.skills);
        if (mapped[0]) setSelected(mapped[0]);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setMatchesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, githubName]);

  const navigate = (p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openDetail = (r: Repository) => {
    setSelected(r);
    navigate("detail");
  };
  const toggleSave = (id: string) =>
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  if (isLoading) {
    return (
      <main className="landing">
        <Logo />
        <p className="hero-note">Connecting…</p>
      </main>
    );
  }

  if (page === "landing")
    return (
      <Landing
        onLogin={() => loginWithRedirect()}
        onExplore={() => navigate("explore")}
        authError={error?.message}
      />
    );
  if (page === "onboarding")
    return <Onboarding onBack={() => navigate("landing")} onComplete={() => navigate("home")} />;
  return (
    <Shell
      page={page}
      navigate={navigate}
      username={username}
      avatar={avatar}
      matchCount={repos.length}
      onLogout={() => logout({ logoutParams: { returnTo: window.location.origin } })}
    >
      {page === "home" && (
        <HomePage
          navigate={navigate}
          openDetail={openDetail}
          repos={repos}
          username={username}
          avatar={avatar}
          skills={skills}
          loading={matchesLoading}
          error={loadError}
        />
      )}
      {page === "explore" && (
        <Explore
          repos={repos}
          selected={selected}
          selectRepo={setSelected}
          openDetail={openDetail}
        />
      )}
      {page === "matches" && (
        <Matches repos={repos} saved={saved} toggleSave={toggleSave} openDetail={openDetail} />
      )}
      {page === "saved" && (
        <SavedPage repos={repos} saved={saved} toggleSave={toggleSave} openDetail={openDetail} />
      )}
      {page === "detail" && (
        <DetailPage repo={selected} saved={saved} toggleSave={toggleSave} navigate={navigate} />
      )}
      {page === "contribute" && (
        <ContributePage repo={selected} username={githubName || ""} />
      )}
      {page === "profile" && (
        <ProfilePage username={username} avatar={avatar} skills={skills} />
      )}
    </Shell>
  );
}
