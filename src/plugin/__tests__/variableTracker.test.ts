import { describe, it, expect, vi } from 'vitest';
import { buildMetadataMap, findVariable, analyzeNameConflicts, computeSyncPreview } from '../variableTracker';

// ── Mock creators ─────────────────────────────────────────────────────────────

function createMockVariable(
  id: string,
  name: string,
  collectionId: string,
  resolvedType: string = 'COLOR',
  initialMetadata: Record<string, string> = {}
): Variable {
  const pluginData = new Map<string, string>();
  Object.entries(initialMetadata).forEach(([k, v]) => pluginData.set(k, v));

  return {
    id,
    name,
    variableCollectionId: collectionId,
    resolvedType,
    description: '',
    valuesByMode: {},
    getPluginData: (key: string) => pluginData.get(key) || '',
    setPluginData: (key: string, value: string) => {
      pluginData.set(key, value);
    },
    remove: vi.fn(),
  } as unknown as Variable;
}

function createMockCollection(id: string, name: string): VariableCollection {
  return {
    id,
    name,
    modes: [{ modeId: 'mode-1', name: 'Default' }],
  } as unknown as VariableCollection;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('buildMetadataMap', () => {
  it('correctly maps variables by tokenRef', () => {
    const col = createMockCollection('col-1', 'Tokens');
    const v1 = createMockVariable('v-1', 'color/primary', 'col-1', 'COLOR', { tokenRef: 'token:primary' });
    const v2 = createMockVariable('v-2', 'color/secondary', 'col-1', 'COLOR', { tokenRef: 'token:secondary' });

    const map = buildMetadataMap(col, [v1, v2]);
    expect(map.size).toBe(2);
    expect(map.get('token:primary')).toBe(v1);
    expect(map.get('token:secondary')).toBe(v2);
  });

  it('prunes duplicate metadata from the second variable (Alt-drag safeguard)', () => {
    const col = createMockCollection('col-1', 'Tokens');
    const v1 = createMockVariable('v-1', 'color/primary', 'col-1', 'COLOR', { tokenRef: 'token:primary' });
    const v2 = createMockVariable('v-2', 'color/primary-copy', 'col-1', 'COLOR', { tokenRef: 'token:primary' });

    const map = buildMetadataMap(col, [v1, v2]);
    expect(map.size).toBe(1);
    expect(map.get('token:primary')).toBe(v1);
    expect(v2.getPluginData('tokenRef')).toBe(''); // cleared!
  });

  it('prunes metadata with mismatched prefixes', () => {
    const col = createMockCollection('col-1', 'Tokens');
    const v1 = createMockVariable('v-1', 'color/primary', 'col-1', 'COLOR', { tokenRef: 'scale:primary' });

    const map = buildMetadataMap(col, [v1], 'token:');
    expect(map.size).toBe(0);
    expect(v1.getPluginData('tokenRef')).toBe(''); // cleared!
  });
});

describe('findVariable', () => {
  it('resolves variables by metadata lookup first', () => {
    const col = createMockCollection('col-1', 'Tokens');
    const v1 = createMockVariable('v-1', 'color/custom', 'col-1', 'COLOR', { tokenRef: 'token:primary' });
    const metadataMap = new Map<string, Variable>([['token:primary', v1]]);

    const result = findVariable(col, 'token:primary', 'color/primary', metadataMap, [v1]);
    expect(result).toBe(v1);
  });

  it('falls back to name matching and migrates legacy variables', () => {
    const col = createMockCollection('col-1', 'Tokens');
    const v1 = createMockVariable('v-1', 'color/primary', 'col-1', 'COLOR');
    const metadataMap = new Map<string, Variable>();

    const result = findVariable(col, 'token:primary', 'color/primary', metadataMap, [v1]);
    expect(result).toBe(v1);
    expect(v1.getPluginData('tokenRef')).toBe('token:primary'); // migrated!
    expect(metadataMap.get('token:primary')).toBe(v1); // added to map!
  });

  it('returns null if no variable matches by ref or name', () => {
    const col = createMockCollection('col-1', 'Tokens');
    const v1 = createMockVariable('v-1', 'color/primary', 'col-1', 'COLOR');
    const metadataMap = new Map<string, Variable>();

    const result = findVariable(col, 'token:secondary', 'color/secondary', metadataMap, [v1]);
    expect(result).toBeNull();
  });
});

describe('analyzeNameConflicts', () => {
  const engineResult = {
    scales: {
      Primary: {
        '5': { stepName: 'Primary/5', value: '#0066FF' }
      }
    },
    tokens: {
      light: {
        Primary: {
          'r1': {
            '0': { tokenRef: 'Primary/5', value: '#0066FF' }
          }
        }
      }
    }
  };

  const config = {
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    colors: [{ name: 'Primary', shorthand: 'pr', _id: 'c-primary' }],
    roles: {
      'r1': { name: 'text', shorthand: 'tx', _id: 'r-text' }
    },
    variations: [{ name: 'default', shorthand: 'df', _id: 'v-default' }]
  };

  it('detects scale rename conflicts', () => {
    const scaleCol = createMockCollection('col-scale', '_scale');
    const localVars = [
      createMockVariable('v-scale', 'Primary/5-custom', 'col-scale', 'COLOR', { tokenRef: 'scale:c-primary/5' })
    ];

    const conflicts = analyzeNameConflicts(engineResult, config, localVars, null, scaleCol, null);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      tokenRef: 'scale:c-primary/5',
      figmaName: 'Primary/5-custom',
      suggestedName: 'Primary/5',
      type: 'scale'
    });
  });

  it('detects token rename conflicts', () => {
    const tokenCol = createMockCollection('col-token', 'color tokens');
    const localVars = [
      createMockVariable('v-token', 'Primary/text/default-custom', 'col-token', 'COLOR', { tokenRef: 'token:c-primary/r-text/v-default' })
    ];

    const conflicts = analyzeNameConflicts(engineResult, config, localVars, tokenCol, null, null);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      tokenRef: 'token:c-primary/r-text/v-default',
      figmaName: 'Primary/text/default-custom',
      suggestedName: 'Primary/text/default',
      type: 'token'
    });
  });

  it('returns empty list if names are matching suggested layout', () => {
    const tokenCol = createMockCollection('col-token', 'color tokens');
    const localVars = [
      createMockVariable('v-token', 'Primary/text/default', 'col-token', 'COLOR', { tokenRef: 'token:c-primary/r-text/v-default' })
    ];

    const conflicts = analyzeNameConflicts(engineResult, config, localVars, tokenCol, null, null);
    expect(conflicts).toHaveLength(0);
  });

  it('returns empty list when all collections are null', () => {
    const conflicts = analyzeNameConflicts(engineResult, config, [], null, null, null);
    expect(conflicts).toHaveLength(0);
  });

  it('uses shorthand color labels when useShorthandColors is true', () => {
    const scaleCol = createMockCollection('col-scale', '_scale');
    const localVars = [
      createMockVariable('v-scale', 'Primary/5-custom', 'col-scale', 'COLOR', { tokenRef: 'scale:c-primary/5' })
    ];
    const shorthandConfig = { ...config, useShorthandColors: true };

    const conflicts = analyzeNameConflicts(engineResult, shorthandConfig, localVars, null, scaleCol, null);
    expect(conflicts).toHaveLength(1);
    // shorthand 'pr' is used instead of 'Primary'
    expect(conflicts[0].suggestedName).toBe('pr/5');
  });

  it('falls back to color name when shorthand not found', () => {
    const scaleCol = createMockCollection('col-scale', '_scale');
    const localVars = [
      createMockVariable('v-scale', 'Unknown/5-custom', 'col-scale', 'COLOR', { tokenRef: 'scale:Unknown/5' })
    ];
    const shorthandConfig = {
      ...config,
      useShorthandColors: true,
      // colors list does not contain 'Unknown'
    };
    const resultWithUnknown = {
      scales: { Unknown: { '5': { stepName: 'Unknown/5' } } },
      tokens: {}
    };

    const conflicts = analyzeNameConflicts(resultWithUnknown, shorthandConfig, localVars, null, scaleCol, null);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].suggestedName).toBe('Unknown/5');
  });

  it('uses shorthand role labels when useShorthandRoles is true', () => {
    const tokenCol = createMockCollection('col-token', 'color tokens');
    // role key must be numeric so parseInt(roleId) gives a valid array index
    const numericResult = {
      ...engineResult,
      tokens: { light: { Primary: { '0': { '0': { tokenRef: 'Primary/5', value: '#0066FF' } } } } }
    };
    const localVars = [
      createMockVariable('v-token', 'Primary/text/default-custom', 'col-token', 'COLOR', { tokenRef: 'token:c-primary/r-text/v-default' })
    ];
    // roles as array so index 0 resolves correctly
    const shorthandConfig = {
      ...config,
      useShorthandRoles: true,
      roles: [{ name: 'text', shorthand: 'tx', _id: 'r-text' }]
    };

    const conflicts = analyzeNameConflicts(numericResult, shorthandConfig, localVars, tokenCol, null, null);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].suggestedName).toBe('Primary/tx/default');
  });

  it('uses shorthand variation labels when useShorthandVariations is true', () => {
    const tokenCol = createMockCollection('col-token', 'color tokens');
    const localVars = [
      createMockVariable('v-token', 'Primary/text/default-custom', 'col-token', 'COLOR', { tokenRef: 'token:c-primary/r-text/v-default' })
    ];
    const shorthandConfig = { ...config, useShorthandVariations: true };

    const conflicts = analyzeNameConflicts(engineResult, shorthandConfig, localVars, tokenCol, null, null);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].suggestedName).toBe('Primary/text/df');
  });

  it('uses step shorthands when useShorthandSteps is true', () => {
    const scaleCol = createMockCollection('col-scale', '_scale');
    const localVars = [
      createMockVariable('v-scale', 'Primary/5-custom', 'col-scale', 'COLOR', { tokenRef: 'scale:c-primary/5' })
    ];
    const shorthandConfig = {
      ...config,
      useShorthandSteps: true,
      scaleStepShorthands: { '5': 'five' }
    };

    const conflicts = analyzeNameConflicts(engineResult, shorthandConfig, localVars, null, scaleCol, null);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].suggestedName).toBe('Primary/five');
  });

  it('uses custom role variations when customVariationList is set', () => {
    const tokenCol = createMockCollection('col-token', 'color tokens');
    const localVars = [
      createMockVariable('v-token', 'Primary/text/wrong-name', 'col-token', 'COLOR', { tokenRef: 'token:c-primary/r-text/cv-0' })
    ];
    const configWithCustomVars = {
      ...config,
      roles: {
        'r1': {
          name: 'text', shorthand: 'tx', _id: 'r-text',
          customVariationList: true,
          customVariations: [{ name: 'Subtle', shorthand: 'su', _id: 'cv-0' }]
        }
      }
    };

    const conflicts = analyzeNameConflicts(engineResult, configWithCustomVars, localVars, tokenCol, null, null);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].suggestedName).toBe('Primary/text/Subtle');
  });

  it('uses role/color/variation order when tokenGrouping is role', () => {
    const tokenCol = createMockCollection('col-token', 'color tokens');
    const localVars = [
      createMockVariable('v-token', 'wrong/order/name', 'col-token', 'COLOR', { tokenRef: 'token:c-primary/r-text/v-default' })
    ];
    const roleGroupedConfig = { ...config, tokenGrouping: 'role' };

    const conflicts = analyzeNameConflicts(engineResult, roleGroupedConfig, localVars, tokenCol, null, null);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].suggestedName).toBe('text/Primary/default');
  });

  it('respects custom tokenNameSegments order', () => {
    const tokenCol = createMockCollection('col-token', 'color tokens');
    const localVars = [
      createMockVariable('v-token', 'wrong/order', 'col-token', 'COLOR', { tokenRef: 'token:c-primary/r-text/v-default' })
    ];
    const customOrderConfig = { ...config, tokenNameSegments: ['variation', 'color', 'role'] };

    const conflicts = analyzeNameConflicts(engineResult, customOrderConfig, localVars, tokenCol, null, null);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].suggestedName).toBe('default/Primary/text');
  });

  it('skips token entries where variation index has no token', () => {
    const tokenCol = createMockCollection('col-token', 'color tokens');
    // variation '0' exists but '1' does not in the engine result
    const sparseResult = {
      ...engineResult,
      tokens: {
        light: {
          Primary: { 'r1': { '1': null } } // index 1 but variationDefs has only index 0
        }
      }
    };

    const conflicts = analyzeNameConflicts(sparseResult, config, [], tokenCol, null, null);
    expect(conflicts).toHaveLength(0);
  });

  it('detects source constant rename conflicts', () => {
    const sourceCol = createMockCollection('col-source', '_constants');
    const localVars = [
      createMockVariable('v-source', 'Primary/custom-name', 'col-source', 'COLOR', { tokenRef: 'source:c-primary' })
    ];
    const sourceConfig = { ...config, includeSourceColors: true, colors: [{ name: 'Primary', shorthand: 'pr', _id: 'c-primary' }] };

    const conflicts = analyzeNameConflicts(engineResult, sourceConfig, localVars, null, null, sourceCol);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      tokenRef: 'source:c-primary',
      figmaName: 'Primary/custom-name',
      suggestedName: 'Primary/Primary',
      type: 'source'
    });
  });

  it('uses shorthand label for source constants when useShorthandColors is true', () => {
    const sourceCol = createMockCollection('col-source', '_constants');
    const localVars = [
      createMockVariable('v-source', 'Primary/custom-name', 'col-source', 'COLOR', { tokenRef: 'source:c-primary' })
    ];
    const sourceConfig = {
      ...config,
      useShorthandColors: true,
      includeSourceColors: true,
      colors: [{ name: 'Primary', shorthand: 'pr', _id: 'c-primary' }]
    };

    const conflicts = analyzeNameConflicts(engineResult, sourceConfig, localVars, null, null, sourceCol);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].suggestedName).toBe('pr/pr');
  });

  it('detects alpha tint source constant rename conflicts', () => {
    const sourceCol = createMockCollection('col-source', '_constants');
    const localVars = [
      createMockVariable('v-alpha', 'Primary/Opacities/50-custom', 'col-source', 'COLOR', { tokenRef: 'source:c-primary/50' })
    ];
    const sourceConfig = {
      ...config,
      includeSourceColors: true,
      alphaValues: [50],
      colors: [{ name: 'Primary', shorthand: 'pr', _id: 'c-primary' }]
    };

    const conflicts = analyzeNameConflicts(engineResult, sourceConfig, localVars, null, null, sourceCol);
    // 1 alpha conflict (base source doesn't exist in vars so no base conflict)
    const alphaConflict = conflicts.find(c => c.tokenRef === 'source:c-primary/50');
    expect(alphaConflict).toBeDefined();
    expect(alphaConflict!.suggestedName).toBe('Primary/Opacities/50');
    expect(alphaConflict!.type).toBe('source');
  });

  it('returns no conflicts when source constant names already match', () => {
    const sourceCol = createMockCollection('col-source', '_constants');
    const localVars = [
      createMockVariable('v-source', 'Primary/Primary', 'col-source', 'COLOR', { tokenRef: 'source:c-primary' })
    ];
    const sourceConfig = { ...config, includeSourceColors: true, colors: [{ name: 'Primary', shorthand: 'pr', _id: 'c-primary' }] };

    const conflicts = analyzeNameConflicts(engineResult, sourceConfig, localVars, null, null, sourceCol);
    expect(conflicts).toHaveLength(0);
  });

  it('skips source check when includeSourceColors is false', () => {
    const sourceCol = createMockCollection('col-source', '_constants');
    const localVars = [
      createMockVariable('v-source', 'Primary/custom', 'col-source', 'COLOR', { tokenRef: 'source:c-primary' })
    ];
    // includeSourceColors not set → should not produce conflicts
    const conflicts = analyzeNameConflicts(engineResult, config, localVars, null, null, sourceCol);
    expect(conflicts).toHaveLength(0);
  });

  it('handles missing tokens gracefully when tokens object is empty', () => {
    const tokenCol = createMockCollection('col-token', 'color tokens');
    const emptyResult = { scales: {}, tokens: {} };

    const conflicts = analyzeNameConflicts(emptyResult, config, [], tokenCol, null, null);
    expect(conflicts).toHaveLength(0);
  });
});

describe('computeSyncPreview', () => {
  const engineResult = {
    scales: {
      Primary: {
        '5': { stepName: 'Primary/5', value: '#0066FF' }
      }
    },
    tokens: {
      light: {
        Primary: {
          '0': {
            '0': { tokenRef: 'Primary/5', value: '#0066FF', roleDescription: 'Primary color' }
          }
        }
      }
    }
  };

  const config = {
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    colors: [{ name: 'Primary', shorthand: 'pr', _id: 'c-primary' }],
    roles: [{ name: 'text', shorthand: 'tx', _id: 'r-text' }],
    variations: [{ name: 'default', shorthand: 'df', _id: 'v-default' }]
  };

  it('correctly counts variables as toCreate when collections are null', () => {
    const preview = computeSyncPreview(engineResult, config, [], []);
    expect(preview.toCreate).toBe(2);
    expect(preview.toUpdate).toBe(0);
    expect(preview.toRename).toBe(0);
    expect(preview.total).toBe(2);
  });

  it('returns 0 changes when all variables are already up to date', () => {
    const scaleCol = createMockCollection('col-scale', '_scale');
    const tokenCol = createMockCollection('col-token', 'color tokens');

    const vScale = createMockVariable('v-scale', 'Primary/5', 'col-scale', 'COLOR', { tokenRef: 'scale:c-primary/5' });
    vScale.valuesByMode = { 'mode-1': { r: 0, g: 0.4, b: 1 } };
    vScale.description = '';

    const vToken = createMockVariable('v-token', 'Primary/text/default', 'col-token', 'COLOR', { tokenRef: 'token:c-primary/r-text/v-default' });
    vToken.valuesByMode = { 'mode-1': { r: 0, g: 0.4, b: 1 } };
    vToken.description = 'Primary color';

    const preview = computeSyncPreview(engineResult, config, [vScale, vToken], [scaleCol, tokenCol]);
    expect(preview.toCreate).toBe(0);
    expect(preview.toUpdate).toBe(0);
    expect(preview.toRename).toBe(0);
    expect(preview.total).toBe(0);
  });

  it('correctly counts updates and renames', () => {
    const scaleCol = createMockCollection('col-scale', '_scale');
    const tokenCol = createMockCollection('col-token', 'color tokens');

    const vScale = createMockVariable('v-scale', 'Primary/5-old', 'col-scale', 'COLOR', { tokenRef: 'scale:c-primary/5' });
    vScale.valuesByMode = { 'mode-1': { r: 0, g: 0.4, b: 1 } };

    const vToken = createMockVariable('v-token', 'Primary/text/default', 'col-token', 'COLOR', { tokenRef: 'token:c-primary/r-text/v-default' });
    vToken.valuesByMode = { 'mode-1': { r: 0, g: 0.4, b: 1 } };
    vToken.description = 'Old Description';

    const preview = computeSyncPreview(engineResult, config, [vScale, vToken], [scaleCol, tokenCol]);
    expect(preview.toCreate).toBe(0);
    expect(preview.toRename).toBe(1);
    expect(preview.toUpdate).toBe(1);
    expect(preview.total).toBe(2);
  });
});
