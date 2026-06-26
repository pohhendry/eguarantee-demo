import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import RendererApp from './RendererApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RendererApp />
  </StrictMode>,
);
