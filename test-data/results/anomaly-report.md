# Color Engine Stress Test — Anomaly Report

Generated: 2026-07-13T12:40:16.481Z
Total cases run: 5488
Total anomalies flagged: 1645

## By severity
- **critical**: 0
- **high**: 38
- **medium**: 1607

## By anomaly type
- `contrast_overshoot`: 1568
- `engine_warning`: 39
- `contrast_target_missed`: 38

## Scale algorithm reliability (cases with >=1 warning or Fail rating)
- Natural: 0/196 flagged
- Uniform: 0/196 flagged
- Expressive: 0/196 flagged
- Symmetric: 0/196 flagged
- OKLCH: 6/196 flagged
- Material: 0/196 flagged
- Linear: 33/196 flagged
- Fidelity: 0/196 flagged

## Solver mode reliability (cases with >=1 warning or Fail rating)
- natural: 0/784 flagged
- constant-chroma: 0/784 flagged
- symmetric: 0/784 flagged
- hue-locked: 0/784 flagged
- max-chroma: 0/784 flagged

## Top 30 flagged cases (critical/high first)
- [high] `scale_h0_s50_l30_Linear_len5` — contrast_target_missed: worst shortfall -0.67 (achieved below target)
- [high] `scale_h0_s50_l90_Linear_len5` — contrast_target_missed: worst shortfall -0.61 (achieved below target)
- [high] `scale_h0_s90_l50_OKLCH_len9` — contrast_target_missed: worst shortfall -1.15 (achieved below target)
- [high] `scale_h0_s90_l50_Linear_len5` — contrast_target_missed: worst shortfall -1.5 (achieved below target)
- [high] `scale_h60_s50_l30_Linear_len5` — contrast_target_missed: worst shortfall -1.3 (achieved below target)
- [high] `scale_h60_s50_l90_Linear_len5` — contrast_target_missed: worst shortfall -1.14 (achieved below target)
- [high] `scale_h60_s90_l50_Linear_len5` — contrast_target_missed: worst shortfall -3.69 (achieved below target)
- [high] `scale_h90_s50_l30_Linear_len5` — contrast_target_missed: worst shortfall -0.63 (achieved below target)
- [high] `scale_h90_s50_l90_Linear_len5` — contrast_target_missed: worst shortfall -0.5 (achieved below target)
- [high] `scale_h90_s90_l50_Linear_len5` — contrast_target_missed: worst shortfall -2.8 (achieved below target)
- [high] `scale_h120_s50_l30_Linear_len5` — contrast_target_missed: worst shortfall -0.18 (achieved below target)
- [high] `scale_h120_s90_l50_Linear_len5` — contrast_target_missed: worst shortfall -2.38 (achieved below target)
- [high] `scale_h150_s50_l30_Linear_len5` — contrast_target_missed: worst shortfall -0.33 (achieved below target)
- [high] `scale_h150_s50_l90_Linear_len5` — contrast_target_missed: worst shortfall -0.2 (achieved below target)
- [high] `scale_h150_s90_l50_Linear_len5` — contrast_target_missed: worst shortfall -2.53 (achieved below target)
- [high] `scale_h180_s50_l30_Linear_len5` — contrast_target_missed: worst shortfall -0.58 (achieved below target)
- [high] `scale_h180_s50_l90_Linear_len5` — contrast_target_missed: worst shortfall -0.44 (achieved below target)
- [high] `scale_h180_s90_l50_Linear_len5` — contrast_target_missed: worst shortfall -2.87 (achieved below target)
- [high] `scale_h240_s50_l30_Linear_len5` — contrast_target_missed: worst shortfall -1.42 (achieved below target)
- [high] `scale_h240_s50_l90_Linear_len5` — contrast_target_missed: worst shortfall -1.33 (achieved below target)
- [high] `scale_h240_s90_l50_Linear_len5` — contrast_target_missed: worst shortfall -2.86 (achieved below target)
- [high] `scale_h270_s50_l30_Linear_len5` — contrast_target_missed: worst shortfall -0.88 (achieved below target)
- [high] `scale_h270_s50_l90_Linear_len5` — contrast_target_missed: worst shortfall -0.81 (achieved below target)
- [high] `scale_h270_s90_l50_Linear_len5` — contrast_target_missed: worst shortfall -1.94 (achieved below target)
- [high] `scale_h300_s50_l30_Linear_len5` — contrast_target_missed: worst shortfall -0.28 (achieved below target)
- [high] `scale_h300_s50_l90_Linear_len5` — contrast_target_missed: worst shortfall -0.24 (achieved below target)
- [high] `scale_h300_s90_l50_OKLCH_len9` — contrast_target_missed: worst shortfall -1.42 (achieved below target)
- [high] `scale_h300_s90_l50_Linear_len5` — contrast_target_missed: worst shortfall -0.81 (achieved below target)
- [high] `scale_h330_s50_l30_Linear_len5` — contrast_target_missed: worst shortfall -0.48 (achieved below target)
- [high] `scale_h330_s50_l90_Linear_len5` — contrast_target_missed: worst shortfall -0.43 (achieved below target)
