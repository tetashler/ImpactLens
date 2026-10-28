'use client';

import type { ScenarioResponse } from '../lib/scenarios/contract.ts';
import { presentScenarioPlan, type ScenarioConfigurationMode } from '../lib/scenarios/presentation.ts';
import './scenario-plan-view.css';

export interface ScenarioPlanViewProps {
  response: ScenarioResponse;
  onConfigure: (mode: ScenarioConfigurationMode) => void;
  onRevise: () => void;
}

export default function ScenarioPlanView({ response, onConfigure, onRevise }: ScenarioPlanViewProps) {
  const { plan } = response;
  const view = presentScenarioPlan(response);
  const action = view.primaryAction;
  const researchOnly = plan.execution !== 'calculated';

  return <article className="scenario-plan-view" aria-label="Scenario interpretation plan" data-plan-id={plan.planId} data-client-request-id={response.clientRequestId}>
    <header className="scenario-plan-heading">
      <p className="scenario-plan-state"><span aria-hidden="true" />{view.stateLabel}</p>
      <h2>{plan.title}</h2>
      <p className="scenario-plan-intent">{plan.interpretedIntent}</p>
      <p className="scenario-provider-notice">{view.providerNotice}</p>
    </header>

    <div className="scenario-plan-content">
      <section className="scenario-plan-approach" aria-label="Selected capability and availability">
        <dl className="scenario-plan-capability">
          <div><dt>Approach</dt><dd>{view.routeLabel}</dd></div>
          <div><dt>Capability</dt><dd>{view.capabilityLabel}</dd></div>
          <div><dt>Availability</dt><dd>{view.availabilityLabel}</dd></div>
        </dl>
        <p className="scenario-plan-scope">{view.scopeNote}</p>
      </section>

      <section className="scenario-plan-section">
        <h3>{view.inputHeading}</h3>
        <ul className="scenario-plan-inputs">{plan.missingInputs.map(input => <li key={input.id}>{input.label}</li>)}</ul>
      </section>

      <section className="scenario-plan-section">
        <h3>{view.outcomesHeading}</h3>
        {plan.supportedOutcomes.length > 0
          ? <ul>{plan.supportedOutcomes.map(outcome => <li key={outcome}>{outcome}</li>)}</ul>
          : <p>No supported outcome is defined for this request. Revise the question to explore evidence or an aggregate scenario.</p>}
      </section>

      <section className="scenario-plan-section scenario-plan-boundaries">
        <h3>Cannot establish</h3>
        <ul>{plan.unsupportedOutcomes.map(outcome => <li key={outcome}>{outcome}</li>)}</ul>
      </section>

      {researchOnly && <>
        <section className="scenario-plan-section">
          <h3>Research questions</h3>
          <ul>{plan.researchQuestions.map(question => <li key={question}>{question}</li>)}</ul>
          {plan.stakeholders.length > 0 && <p className="scenario-plan-stakeholders"><strong>Stakeholder categories:</strong> {plan.stakeholders.join(', ')}.</p>}
        </section>
        <section className="scenario-plan-section">
          <h3>Evidence needed</h3>
          <ul>{plan.evidenceRequirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul>
        </section>
      </>}

      <div className="scenario-plan-disclosures">
        <details>
          <summary>How this was interpreted</summary>
          <div className="scenario-plan-disclosure-content">
            <p><strong>{view.interpretationLabel}</strong></p>
            <p>{view.providerNotice}</p>
            <p>{plan.routeReason}</p>
            {!researchOnly && <ul>{plan.evidenceRequirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul>}
            <p>No calculation, agent execution or evidence retrieval has occurred.</p>
          </div>
        </details>
        <details>
          <summary>Assumptions and limits</summary>
          <div className="scenario-plan-disclosure-content">
            <h4>Assumptions</h4>
            <ul>{plan.assumptions.map(assumption => <li key={assumption}>{assumption}</li>)}</ul>
            <h4>Limits</h4>
            <ul>{plan.limitations.map(limitation => <li key={limitation}>{limitation}</li>)}</ul>
            {plan.request.mapPoints?.length ? <p>Supplied map points are user inputs. They have not been validated for execution.</p> : null}
          </div>
        </details>
        <details>
          <summary>Plan reference</summary>
          <div className="scenario-plan-disclosure-content"><p className="scenario-plan-reference">{plan.planId}</p></div>
        </details>
      </div>
    </div>

    <footer className="scenario-plan-actions">
      {action
        ? <><p>Complete the inputs in the editor. Calculation needs a separate confirmation.</p><button type="button" className="scenario-plan-primary" onClick={() => onConfigure(action.mode)}>{action.label}</button></>
        : <p>{plan.nextAction}</p>}
      <button type="button" className="scenario-plan-revise" onClick={onRevise}>Revise question</button>
    </footer>
  </article>;
}
