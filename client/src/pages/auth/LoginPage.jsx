import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useThemeStore } from '../../store/useThemeStore.js';
import { login } from '../../services/auth.service.js';
import { useNotificationStore } from '../../store/useNotificationStore.js';
import InPageNotice from '../../components/common/InPageNotice.jsx';
import { useTranslation } from '../../config/i18n.js';
import { Eye, EyeOff } from 'lucide-react';
import './LoginPage.css';

function BalanceModel() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
    camera.position.set(0, 0, 3);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x193b62, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x8ec5ff, 1.4);
    fillLight.position.set(-3, 1, 2);
    scene.add(fillLight);

    let model = null;
    let modelSize = null;
    let animationFrame;
    const fitCamera = () => {
      if (!modelSize) return;
      const aspect = camera.aspect || 1;
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
      const verticalDistance = (modelSize.y / 2) / Math.tan(verticalFov / 2);
      const horizontalDistance = (modelSize.x / 2) / Math.tan(horizontalFov / 2);
      camera.position.set(0, 0, Math.max(verticalDistance, horizontalDistance) * 1.3);
      camera.lookAt(0, 0, 0);
    };

    const loader = new GLTFLoader();
    loader.load('/tt.glb', (gltf) => {
      model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z) || 1;
      const modelScale = 1.35 / maxDimension;
      model.scale.setScalar(modelScale);
      model.position.copy(center).multiplyScalar(-modelScale);
      modelSize = size.multiplyScalar(modelScale);
      scene.add(model);
      fitCamera();
    });

    const resize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      fitCamera();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const animate = () => {
      if (model) model.rotation.y += 0.003;
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      model?.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
          else child.material?.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="balance-model" />;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useNotificationStore((s) => s.addToast);
  const { language } = useThemeStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ email, password });
      setAuth({ token: res.data.token, user: res.data.user });
      addToast({ type: 'success', message: `Welcome, ${res.data.user.name}` });
      navigate('/dashboard');
    } catch {
      // error toast is handled by apiClient interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-visual" aria-hidden="true">
        <div className="login-visual-glow" />
        <BalanceModel />
      </div>
      <div className="login-card">
        <InPageNotice />
        <div className="login-brand">
          <img src="/ascension-logo.png" alt="Ascension" className="login-emblem" onError={(e) => { e.target.style.display = 'none'; }} />
          <h1>{language === 'HI' ? 'NAWI डिजिटल मापविज्ञान प्रणाली' : 'NAWI Digital Metrology System'}</h1>
          <p className="login-dept">
            {language === 'HI' ? 'टीम एसेंशन' : 'Team Ascension'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="gov-form-group">
            <label className="gov-label" htmlFor="email">{t('login_email')}</label>
            <input
              id="email"
              data-testid="login-email"
              type="email"
              className="gov-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@nawi.gov.in"
              required
              autoFocus
            />
          </div>

          <div className="gov-form-group">
            <label className="gov-label" htmlFor="password">{t('login_password')}</label>
            <div className="login-pw-wrap">
              <input
                id="password"
                data-testid="login-password"
                type={showPw ? 'text' : 'password'}
                className="gov-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button type="button" aria-label={showPw ? 'Hide password' : 'Show password'} className="login-pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" data-testid="login-submit" className="gov-btn gov-btn-primary login-submit" disabled={loading}>
            {loading ? t('login_authenticating') : t('login_sign_in')}
          </button>
        </form>

        <div className="login-demo-creds">
          <p style={{ marginBottom: 8 }}><strong>{t('login_demo')}</strong></p>
          <div className="login-role-grid">
            <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setEmail('admin@nawi.gov.in'); setPassword('Password123!'); }}>
              Admin
            </button>
            <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setEmail('tech@npl.res.in'); setPassword('Password123!'); }}>
              Lab Tech
            </button>
            <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setEmail('reviewer@doca.gov.in'); setPassword('Password123!'); }}>
              Reviewer
            </button>
            <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setEmail('labadmin@npl.res.in'); setPassword('Password123!'); }}>
              Lab Admin
            </button>
            <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setEmail('officer@doca.gov.in'); setPassword('Password123!'); }}>
              DoCA Officer
            </button>
            <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setEmail('rep@averyindia.com'); setPassword('Password123!'); }}>
              Manufacturer
            </button>
            <button type="button" className="gov-btn gov-btn-outline" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => { setEmail('auditor@nawi.gov.in'); setPassword('Password123!'); }}>
              Auditor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
