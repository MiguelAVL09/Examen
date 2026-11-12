import { Component } from 'react';
import type { ReactNode } from 'react';

export class ExpertViewBoundary extends Component<{ children: ReactNode; onBack: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <section className="quiz-message" role="alert">
        <h1>No se pudo abrir el panel de expertos</h1>
        <p>Puedes intentar abrir esta sección de nuevo.</p>
        <div className="quiz-hero-actions">
          <button type="button" className="quiz-action quiz-action-primary" onClick={() => this.setState({ failed: false })}>Reintentar</button>
          <button type="button" className="quiz-action" onClick={this.props.onBack}>Volver a encuestas</button>
        </div>
      </section>
    );
  }
}
