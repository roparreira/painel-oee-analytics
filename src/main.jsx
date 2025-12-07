import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Componente para capturar erros
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ERRO CRÍTICO:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', background: '#FEF2F2', minHeight: '100vh', color: '#991B1B' }}>
          <h1 style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem'}}>🚫 Erro Fatal na Inicialização</h1>
          <p style={{marginBottom: '1rem'}}>Ocorreu um erro ao carregar os módulos da aplicação.</p>
          
          <div style={{background: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #FECACA', overflow: 'auto'}}>
            <p style={{fontWeight: 'bold', fontFamily: 'monospace'}}>{this.state.error && this.state.error.toString()}</p>
            {this.state.error?.message?.includes('Failed to fetch dynamically imported module') && (
              <div style={{marginTop: '1rem', padding: '1rem', background: '#EFF6FF', color: '#1E40AF', borderRadius: '0.25rem'}}>
                <strong>Dica de Correção:</strong> Isso geralmente significa que um arquivo importado não foi encontrado.
                <ul style={{listStyle: 'disc', marginLeft: '1.5rem', marginTop: '0.5rem'}}>
                  <li>Verifique se a pasta <code>src/pages</code> existe.</li>
                  <li>Verifique se os arquivos <code>UploadScreen.jsx</code>, <code>AuditScreen.jsx</code> e <code>DashboardScreen.jsx</code> estão dentro dela.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

// Carregamento Lazy para capturar erros de importação no App.jsx
const App = React.lazy(() => import('./App.jsx'));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={
        <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B'}}>
          Carregando sistema...
        </div>
      }>
        <App />
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>,
)