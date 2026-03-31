function createProviderState() {
  return {
    configured: false,
    phases: {
      upcoming: { status: 'idle', count: 0, message: '' },
      live: { status: 'idle', count: 0, message: '' },
      played: { status: 'idle', count: 0, message: '' },
    },
  }
}

export function createProviderDiagnostics() {
  return {
    apiFootball: createProviderState(),
    footballData: createProviderState(),
  }
}

export function markProviderConfigured(diagnostics, provider, configured) {
  if (!diagnostics?.[provider]) {
    return
  }

  diagnostics[provider].configured = configured
}

export function updateProviderPhase(diagnostics, provider, phase, patch) {
  if (!diagnostics?.[provider]?.phases?.[phase]) {
    return
  }

  diagnostics[provider].phases[phase] = {
    ...diagnostics[provider].phases[phase],
    ...patch,
  }
}