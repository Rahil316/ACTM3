import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock figma global
const mockSetPluginData = vi.fn();
const mockGetPluginData = vi.fn();
const mockPostMessage = vi.fn();

const mockFigma = {
  root: {
    setPluginData: mockSetPluginData,
    getPluginData: mockGetPluginData,
  },
  variables: {
    getLocalVariablesAsync: vi.fn(),
    getLocalVariableCollectionsAsync: vi.fn(),
    createVariableCollection: vi.fn(),
    createVariable: vi.fn(),
  },
  ui: {
    postMessage: mockPostMessage,
  },
};

(global as any).figma = mockFigma;

import { VariableManager, savePluginConfig } from '../figmaVars';

describe('VariableManagerSyncTally', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    VariableManager.tally = { created: 0, updated: 0, renamed: 0, failed: 0 };
    VariableManager.mutations.clear();
    VariableManager.cache = { variables: [], collections: [] };
  });

  it('correctly tallies created variables and avoids double counting them as updated', async () => {
    const mockCollection = {
      id: 'col-1',
      name: 'color tokens',
      modes: [{ modeId: 'mode-1', name: 'Light' }],
      addMode: vi.fn().mockReturnValue('mode-1'),
      renameMode: vi.fn(),
    } as any;

    mockFigma.variables.getLocalVariableCollectionsAsync.mockResolvedValue([mockCollection]);
    mockFigma.variables.getLocalVariablesAsync.mockResolvedValue([]);
    mockFigma.variables.createVariable.mockImplementation((name, col, type) => {
      return {
        id: `var-${name}`,
        name,
        variableCollectionId: col.id,
        resolvedType: type,
        description: '',
        valuesByMode: {},
        getPluginData: vi.fn().mockReturnValue(''),
        setPluginData: vi.fn(),
        setValueForMode: vi.fn(),
      } as any;
    });

    const engineResult = {
      scales: {},
      tokens: {
        Light: {
          Primary: {
            '0': {
              '0': { tokenRef: 'Primary/default', value: '#0066FF', roleDescription: 'Primary color' }
            }
          }
        }
      }
    };

    const config = {
      resolveTokensDirectly: true,
      pluginMode: 'direct',
      colors: [{ name: 'Primary', shorthand: 'pr', _id: 'c-primary' }],
      roles: [{ name: 'default', shorthand: 'df', _id: 'r-default' }],
      variations: [{ name: 'default', shorthand: 'df', _id: 'v-default' }],
      tokenCollectionName: 'color tokens',
    };

    await VariableManager.sync(engineResult, config, 'roles', config);

    expect(VariableManager.tally.created).toBe(1);
    expect(VariableManager.tally.updated).toBe(0);
    expect(VariableManager.tally.renamed).toBe(0);
    expect(VariableManager.tally.failed).toBe(0);
  });

  it('correctly tallies updated variables when description or value changes', async () => {
    const mockCollection = {
      id: 'col-1',
      name: 'color tokens',
      modes: [{ modeId: 'mode-1', name: 'Light' }],
      addMode: vi.fn().mockReturnValue('mode-1'),
      renameMode: vi.fn(),
    } as any;

    const mockVariable = {
      id: 'var-1',
      name: 'Primary/default/default',
      variableCollectionId: 'col-1',
      resolvedType: 'COLOR',
      description: 'Old Description',
      valuesByMode: { 'mode-1': { r: 0, g: 0, b: 0 } },
      getPluginData: vi.fn().mockImplementation((key) => {
        if (key === 'tokenRef') return 'token:c-primary/r-default/v-default';
        return '';
      }),
      setPluginData: vi.fn(),
      setValueForMode: vi.fn(),
    } as any;

    mockFigma.variables.getLocalVariableCollectionsAsync.mockResolvedValue([mockCollection]);
    mockFigma.variables.getLocalVariablesAsync.mockResolvedValue([mockVariable]);

    const engineResult = {
      scales: {},
      tokens: {
        Light: {
          Primary: {
            '0': {
              '0': { tokenRef: 'Primary/default', value: '#0066FF', roleDescription: 'New Description' }
            }
          }
        }
      }
    };

    const config = {
      resolveTokensDirectly: true,
      pluginMode: 'direct',
      colors: [{ name: 'Primary', shorthand: 'pr', _id: 'c-primary' }],
      roles: [{ name: 'default', shorthand: 'df', _id: 'r-default' }],
      variations: [{ name: 'default', shorthand: 'df', _id: 'v-default' }],
      tokenCollectionName: 'color tokens',
    };

    await VariableManager.sync(engineResult, config, 'roles', config);

    expect(VariableManager.tally.created).toBe(0);
    expect(VariableManager.tally.updated).toBe(1);
    expect(VariableManager.tally.renamed).toBe(0);
    expect(VariableManager.tally.failed).toBe(0);
  });

  it('counts renamed when a decision is revert and name differs', async () => {
    const mockCollection = {
      id: 'col-1',
      name: 'color tokens',
      modes: [{ modeId: 'mode-1', name: 'Light' }],
      addMode: vi.fn().mockReturnValue('mode-1'),
      renameMode: vi.fn(),
    } as any;

    const mockVariable = {
      id: 'var-1',
      name: 'Primary/default/custom-figma-name',
      variableCollectionId: 'col-1',
      resolvedType: 'COLOR',
      description: '',
      valuesByMode: { 'mode-1': { r: 0, g: 0, b: 0 } },
      getPluginData: vi.fn().mockImplementation((key: string) =>
        key === 'tokenRef' ? 'token:c-primary/r-default/v-default' : ''
      ),
      setPluginData: vi.fn(),
      setValueForMode: vi.fn(),
    } as any;

    mockFigma.variables.getLocalVariableCollectionsAsync.mockResolvedValue([mockCollection]);
    mockFigma.variables.getLocalVariablesAsync.mockResolvedValue([mockVariable]);

    const engineResult = {
      scales: {},
      tokens: {
        Light: {
          Primary: {
            '0': {
              '0': { tokenRef: 'Primary/default', value: '#0066FF', roleDescription: '' }
            }
          }
        }
      }
    };

    const config = {
      resolveTokensDirectly: true,
      pluginMode: 'direct',
      colors: [{ name: 'Primary', shorthand: 'pr', _id: 'c-primary' }],
      roles: [{ name: 'default', shorthand: 'df', _id: 'r-default' }],
      variations: [{ name: 'default', shorthand: 'df', _id: 'v-default' }],
      tokenCollectionName: 'color tokens',
    };

    // decision = 'revert' means overwrite with the suggested name
    // sync(result, config, scope, appState, savedAppState, decisions)
    const decisions = { 'token:c-primary/r-default/v-default': 'revert' as const };
    await VariableManager.sync(engineResult, config, 'roles', config, null, decisions);

    expect(VariableManager.tally.renamed).toBe(1);
    expect(VariableManager.tally.created).toBe(0);
  });

  it('does not rename when target name is occupied by another variable', async () => {
    const mockCollection = {
      id: 'col-1',
      name: 'color tokens',
      modes: [{ modeId: 'mode-1', name: 'Light' }],
      addMode: vi.fn().mockReturnValue('mode-1'),
      renameMode: vi.fn(),
    } as any;

    const existingVar = {
      id: 'var-existing',
      name: 'Primary/default/default', // occupies the suggested name
      variableCollectionId: 'col-1',
      resolvedType: 'COLOR',
      description: '',
      valuesByMode: { 'mode-1': { r: 1, g: 0, b: 0 } },
      getPluginData: vi.fn().mockReturnValue(''),
      setPluginData: vi.fn(),
      setValueForMode: vi.fn(),
    } as any;

    const mockVariable = {
      id: 'var-1',
      name: 'Primary/default/custom-figma-name',
      variableCollectionId: 'col-1',
      resolvedType: 'COLOR',
      description: '',
      valuesByMode: { 'mode-1': { r: 0, g: 0, b: 0 } },
      getPluginData: vi.fn().mockImplementation((key: string) =>
        key === 'tokenRef' ? 'token:c-primary/r-default/v-default' : ''
      ),
      setPluginData: vi.fn(),
      setValueForMode: vi.fn(),
    } as any;

    mockFigma.variables.getLocalVariableCollectionsAsync.mockResolvedValue([mockCollection]);
    mockFigma.variables.getLocalVariablesAsync.mockResolvedValue([existingVar, mockVariable]);

    const engineResult = {
      scales: {},
      tokens: {
        Light: {
          Primary: {
            '0': {
              '0': { tokenRef: 'Primary/default', value: '#FF0000', roleDescription: '' }
            }
          }
        }
      }
    };

    const config = {
      resolveTokensDirectly: true,
      pluginMode: 'direct',
      colors: [{ name: 'Primary', shorthand: 'pr', _id: 'c-primary' }],
      roles: [{ name: 'default', shorthand: 'df', _id: 'r-default' }],
      variations: [{ name: 'default', shorthand: 'df', _id: 'v-default' }],
      tokenCollectionName: 'color tokens',
    };

    const decisions = { 'token:c-primary/r-default/v-default': 'revert' as const };
    await VariableManager.sync(engineResult, config, 'roles', config, null, decisions);

    // rename should be skipped because target name is occupied
    expect(mockVariable.name).toBe('Primary/default/custom-figma-name');
    expect(VariableManager.tally.renamed).toBe(0);
  });

  it('increments failed tally when upsert throws', async () => {
    const mockCollection = {
      id: 'col-1',
      name: 'color tokens',
      modes: [{ modeId: 'mode-1', name: 'Light' }],
      addMode: vi.fn().mockReturnValue('mode-1'),
      renameMode: vi.fn(),
    } as any;

    mockFigma.variables.getLocalVariableCollectionsAsync.mockResolvedValue([mockCollection]);
    mockFigma.variables.getLocalVariablesAsync.mockResolvedValue([]);
    mockFigma.variables.createVariable.mockImplementation(() => {
      throw new Error('Figma API unavailable');
    });

    const engineResult = {
      scales: {},
      tokens: {
        Light: {
          Primary: {
            '0': {
              '0': { tokenRef: 'Primary/default', value: '#0066FF', roleDescription: '' }
            }
          }
        }
      }
    };

    const config = {
      resolveTokensDirectly: true,
      pluginMode: 'direct',
      colors: [{ name: 'Primary', shorthand: 'pr', _id: 'c-primary' }],
      roles: [{ name: 'default', shorthand: 'df', _id: 'r-default' }],
      variations: [{ name: 'default', shorthand: 'df', _id: 'v-default' }],
      tokenCollectionName: 'color tokens',
    };

    await VariableManager.sync(engineResult, config, 'roles', config);

    expect(VariableManager.tally.failed).toBe(1);
    expect(VariableManager.tally.created).toBe(0);
  });

  it('removes and recreates variable on type mismatch', async () => {
    const mockCollection = {
      id: 'col-1',
      name: 'color tokens',
      modes: [{ modeId: 'mode-1', name: 'Light' }],
      addMode: vi.fn().mockReturnValue('mode-1'),
      renameMode: vi.fn(),
    } as any;

    const removeFn = vi.fn();
    const mismatchedVar = {
      id: 'var-mismatch',
      name: 'Primary/default/default',
      variableCollectionId: 'col-1',
      resolvedType: 'FLOAT',  // wrong type — engine expects COLOR
      description: '',
      valuesByMode: {},
      getPluginData: vi.fn().mockImplementation((key: string) =>
        key === 'tokenRef' ? 'token:c-primary/r-default/v-default' : ''
      ),
      setPluginData: vi.fn(),
      setValueForMode: vi.fn(),
      remove: removeFn,
    } as any;

    mockFigma.variables.getLocalVariableCollectionsAsync.mockResolvedValue([mockCollection]);
    mockFigma.variables.getLocalVariablesAsync.mockResolvedValue([mismatchedVar]);
    mockFigma.variables.createVariable.mockImplementation((name: string, col: any, type: string) => ({
      id: 'var-new',
      name,
      variableCollectionId: col.id,
      resolvedType: type,
      description: '',
      valuesByMode: {},
      getPluginData: vi.fn().mockReturnValue(''),
      setPluginData: vi.fn(),
      setValueForMode: vi.fn(),
    }));

    const engineResult = {
      scales: {},
      tokens: {
        Light: {
          Primary: {
            '0': {
              '0': { tokenRef: 'Primary/default', value: '#0066FF', roleDescription: '' }
            }
          }
        }
      }
    };

    const config = {
      resolveTokensDirectly: true,
      pluginMode: 'direct',
      colors: [{ name: 'Primary', shorthand: 'pr', _id: 'c-primary' }],
      roles: [{ name: 'default', shorthand: 'df', _id: 'r-default' }],
      variations: [{ name: 'default', shorthand: 'df', _id: 'v-default' }],
      tokenCollectionName: 'color tokens',
    };

    await VariableManager.sync(engineResult, config, 'roles', config);

    expect(removeFn).toHaveBeenCalledOnce();
    expect(VariableManager.tally.created).toBe(1);
  });
});

// ── savePluginConfig ───────────────────────────────────────────────────────────

describe('savePluginConfig', () => {
  it('writes serialized state to document root', () => {
    const state = { name: 'test', colors: [] };
    savePluginConfig(state);
    expect(mockSetPluginData).toHaveBeenCalledWith('tw_state', JSON.stringify(state));
  });

  it('logs a warning but does not throw when setPluginData fails', () => {
    mockSetPluginData.mockImplementationOnce(() => { throw new Error('disk full'); });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => savePluginConfig({ name: 'test' })).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ── isDifferentValue (via upsert behaviour) ────────────────────────────────────

describe('isDifferentValue edge cases via upsert', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    VariableManager.tally = { created: 0, updated: 0, renamed: 0, failed: 0 };
    VariableManager.mutations.clear();
    VariableManager.cache = { variables: [], collections: [] };
  });

  function makeCollectionSetup(existingValue: any) {
    const mockCollection = {
      id: 'col-1',
      name: 'color tokens',
      modes: [{ modeId: 'mode-1', name: 'Light' }],
      addMode: vi.fn().mockReturnValue('mode-1'),
      renameMode: vi.fn(),
    } as any;

    const mockVar = {
      id: 'var-1',
      name: 'Primary/default/default',
      variableCollectionId: 'col-1',
      resolvedType: 'COLOR',
      description: '',
      valuesByMode: { 'mode-1': existingValue },
      getPluginData: vi.fn().mockImplementation((k: string) =>
        k === 'tokenRef' ? 'token:c-primary/r-default/v-default' : ''
      ),
      setPluginData: vi.fn(),
      setValueForMode: vi.fn(),
    } as any;

    mockFigma.variables.getLocalVariableCollectionsAsync.mockResolvedValue([mockCollection]);
    mockFigma.variables.getLocalVariablesAsync.mockResolvedValue([mockVar]);
    return mockVar;
  }

  const baseConfig = {
    resolveTokensDirectly: true,
    pluginMode: 'direct',
    includeDescriptions: false,  // suppress theme note so only value diffs trigger updates
    colors: [{ name: 'Primary', shorthand: 'pr', _id: 'c-primary' }],
    roles: [{ name: 'default', shorthand: 'df', _id: 'r-default' }],
    variations: [{ name: 'default', shorthand: 'df', _id: 'v-default' }],
    tokenCollectionName: 'color tokens',
  };

  const baseResult = (value: string) => ({
    scales: {},
    tokens: { Light: { Primary: { '0': { '0': { tokenRef: 'Primary/default', value, roleDescription: '' } } } } }
  });

  it('skips setValueForMode when colour is identical within epsilon', async () => {
    const mockVar = makeCollectionSetup({ r: 0.039, g: 0.518, b: 1.0 }); // ~#0A84FF
    await VariableManager.sync(baseResult('#0A84FF'), baseConfig, 'roles', baseConfig);
    expect(mockVar.setValueForMode).not.toHaveBeenCalled();
    expect(VariableManager.tally.updated).toBe(0);
  });

  it('calls setValueForMode when colour differs beyond epsilon', async () => {
    const mockVar = makeCollectionSetup({ r: 0, g: 0, b: 0 });
    await VariableManager.sync(baseResult('#0A84FF'), baseConfig, 'roles', baseConfig);
    expect(mockVar.setValueForMode).toHaveBeenCalledOnce();
    expect(VariableManager.tally.updated).toBe(1);
  });

  it('treats undefined existing value as different', async () => {
    const mockVar = makeCollectionSetup(undefined);
    await VariableManager.sync(baseResult('#0A84FF'), baseConfig, 'roles', baseConfig);
    expect(mockVar.setValueForMode).toHaveBeenCalledOnce();
  });

  it('detects alias ID change as different', async () => {
    const mockVar = makeCollectionSetup({ type: 'VARIABLE_ALIAS', id: 'old-id' });
    // Inject an alias target value (would normally come from a scale ref; here we test the alias path)
    const aliasResult = {
      scales: {},
      tokens: {
        Light: {
          Primary: {
            '0': {
              '0': {
                tokenRef: 'Primary/default',
                value: { type: 'VARIABLE_ALIAS', id: 'new-id' },
                roleDescription: ''
              }
            }
          }
        }
      }
    };
    await VariableManager.sync(aliasResult, baseConfig, 'roles', baseConfig);
    expect(mockVar.setValueForMode).toHaveBeenCalledOnce();
  });

  it('treats two identical aliases as the same (no write)', async () => {
    const mockVar = makeCollectionSetup({ type: 'VARIABLE_ALIAS', id: 'same-id' });
    const aliasResult = {
      scales: {},
      tokens: {
        Light: {
          Primary: {
            '0': {
              '0': {
                tokenRef: 'Primary/default',
                value: { type: 'VARIABLE_ALIAS', id: 'same-id' },
                roleDescription: ''
              }
            }
          }
        }
      }
    };
    await VariableManager.sync(aliasResult, baseConfig, 'roles', baseConfig);
    expect(mockVar.setValueForMode).not.toHaveBeenCalled();
  });
});
