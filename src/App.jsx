import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import './App.css';
import { ChromaticAberration } from './components/ChromaticAberration';
import { IntroAnimation } from './components/IntroAnimation';
import smallProjectsYaml from './data/smallProjects.yaml?raw';
import { parseSimpleYamlList } from './utils/simpleYamlList';

const profileLinks = {
  github: 'https://github.com/Tmino1/portfolio',
  linkedin: 'https://www.linkedin.com/in/travis-minor',
};

const smallProjects = parseSimpleYamlList(smallProjectsYaml);

export default function App() {
  const [viewMode, setViewMode] = useState('interactive');
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [projectsContentVisible, setProjectsContentVisible] = useState(false);
  const [barWidth, setBarWidth] = useState(null);
  const [viewTransition, setViewTransition] = useState(null);
  const navRef = useRef(null);
  const rowRef = useRef(null);
  const viewToggleRef = useRef(null);
  const isStaticView = viewMode === 'static';
  const isTransitioning = Boolean(viewTransition);

  useLayoutEffect(() => {
    let frameId;

    const updateBarWidth = () => {
      const viewportWidth = window.innerWidth - 28;
      const expandedWidth = Math.min(780, viewportWidth);
      const rowWidth = rowRef.current?.scrollWidth ?? rowRef.current?.offsetWidth ?? 0;
      const collapsedWidth = Math.min(rowWidth + 22, viewportWidth);
      setBarWidth(projectsOpen ? expandedWidth : collapsedWidth);
    };

    updateBarWidth();
    frameId = requestAnimationFrame(updateBarWidth);
    window.addEventListener('resize', updateBarWidth);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateBarWidth);
    };
  }, [isStaticView, projectsOpen]);

  useEffect(() => {
    if (!projectsOpen) {
      setProjectsContentVisible(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setProjectsContentVisible(true);
    }, 280);

    return () => window.clearTimeout(timeoutId);
  }, [projectsOpen]);

  useEffect(() => {
    if (!projectsOpen) return undefined;

    const closeProjects = (event) => {
      if (navRef.current?.contains(event.target)) return;
      setProjectsOpen(false);
    };

    window.addEventListener('pointerdown', closeProjects);
    return () => window.removeEventListener('pointerdown', closeProjects);
  }, [projectsOpen]);

  useEffect(() => {
    if (!viewTransition) return undefined;

    const timers = [];
    let frameId = window.requestAnimationFrame(() => {
      setViewTransition((current) => (current ? { ...current, phase: 'covering' } : current));
    });

    timers.push(window.setTimeout(() => {
      setViewMode(viewTransition.targetMode);
      setViewTransition((current) => (current ? { ...current, phase: 'revealing' } : current));
    }, 380));

    timers.push(window.setTimeout(() => {
      setViewTransition(null);
    }, 680));

    return () => {
      window.cancelAnimationFrame(frameId);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [viewTransition?.id]);

  const handleViewToggle = () => {
    if (isTransitioning) return;

    const rect = viewToggleRef.current?.getBoundingClientRect();
    if (!rect) {
      setViewMode((current) => (current === 'interactive' ? 'static' : 'interactive'));
      return;
    }

    setProjectsOpen(false);
    setProjectsContentVisible(false);
    setViewTransition({
      id: Date.now(),
      targetMode: isStaticView ? 'interactive' : 'static',
      phase: 'button',
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      label: isStaticView ? '3D View' : 'Static View',
    });
  };

  return (
    <main className={`portfolio-shell ${isStaticView ? 'is-static-view' : 'is-3d-view'} ${isTransitioning ? 'is-view-transitioning' : ''}`}>
      <nav
        ref={navRef}
        className={`top-bar ${projectsOpen ? 'is-expanded' : ''}`}
        style={barWidth ? { width: `${barWidth}px` } : undefined}
        aria-label="Portfolio navigation"
      >
        <div ref={rowRef} className="top-bar-row">
          <a className="nav-button" href={profileLinks.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className="nav-button" href={profileLinks.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <button
            ref={viewToggleRef}
            className="nav-button view-toggle"
            type="button"
            aria-pressed={isStaticView}
            onClick={handleViewToggle}
          >
            {isStaticView ? '3D View' : 'Static View'}
          </button>
          {!isStaticView && (
            <button
              className="nav-button projects-toggle"
              type="button"
              aria-expanded={projectsOpen}
              aria-controls="small-projects-panel"
              onClick={() => setProjectsOpen((current) => !current)}
            >
              Small Projects
            </button>
          )}
        </div>

        <div
          id="small-projects-panel"
          className={`project-menu-panel ${projectsContentVisible ? 'is-content-visible' : ''}`}
          aria-hidden={!projectsOpen}
        >
          <div className="project-menu-list">
            {smallProjects.map((project) => (
              <a className="project-menu-card" key={project.href} href={project.href} tabIndex={projectsOpen ? 0 : -1}>
                {projectsContentVisible && (
                  <>
                    <span>{project.label}</span>
                    <small>{project.summary}</small>
                  </>
                )}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {isStaticView ? (
        <StaticPortfolio projects={smallProjects} />
      ) : (
        <Canvas
          style={{ background: '#04040c' }}
          camera={{ fov: 50, near: 0.1, far: 1000, position: [0, 1.65, 9.8] }}
          gl={{ antialias: true }}
          dpr={[1, 2]}
        >
          <IntroAnimation />
          <ChromaticAberration amount={0.0016} />
          {/* Your portfolio scene will live here after the intro */}
        </Canvas>
      )}

      {viewTransition && (
        <div
          className={`view-transition ${viewTransition.phase}`}
          style={{
            '--transition-top': `${viewTransition.rect.top}px`,
            '--transition-left': `${viewTransition.rect.left}px`,
            '--transition-width': `${viewTransition.rect.width}px`,
            '--transition-height': `${viewTransition.rect.height}px`,
          }}
          aria-hidden="true"
        >
          <span>{viewTransition.label}</span>
        </div>
      )}
    </main>
  );
}

function StaticPortfolio({ projects }) {
  return (
    <section className="static-view" aria-label="Static portfolio view">
      <div className="static-panel">
        <p className="static-kicker">Portfolio</p>
        <h1>Travis Minor</h1>
        <p className="static-summary">
          Robotics, 3D interfaces, and point-cloud experiments presented in a lightweight view for quick browsing.
        </p>
      </div>

      <div className="static-projects" aria-label="Small projects">
        {projects.map((project) => (
          <article id={project.href.slice(1)} className="static-project" key={project.href}>
            <h2>{project.label}</h2>
            <p>{project.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
