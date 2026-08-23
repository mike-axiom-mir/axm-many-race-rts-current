# Phase 7 Runtime Boundaries

This file exists to prevent capability drift between authored data and implemented runtime behavior.

## Implemented now

### Scenario authoring

- decorations with asset, tint, scale, rotation, collision metadata, owner, tags, layer and rules;
- surface/tile paint with skin, tint, radius, opacity, blend, tags and rules;
- rule zones with preset, radius, ownership/tags and rules;
- global rules and object-local rules;
- variables;
- campaign metadata and objectives;
- flat and globe coordinate preservation.

### Globe runtime

- true spherical positions and great-circle movement;
- geodesic combat distance;
- player/AI capitals, founders and formations;
- macro resource allocation;
- age progression;
- reinforcement and territorial AI;
- strategic capture and income;
- faction behavior modifiers;
- scenario start/timer/capture/destruction/threshold/objective/variable rule execution;
- surface skin movement multipliers and hazardous-surface attrition;
- custom globe map loading.

## Authored now, adapter still pending or partial

- zone-enter / zone-leave runtime emission;
- arbitrary live object enable/disable across every runtime;
- live object skin replacement during a match;
- rule-driven decoration spawning;
- complete diplomacy state and diplomacy effects;
- full flat-skirmish consumption of Scenario Studio decoration/rule/surface layers;
- globe building construction and globe-specific defensive structures;
- browser/runtime smoke verification from a real local run.

Do not report pending items as completed merely because their schema/action types exist.
