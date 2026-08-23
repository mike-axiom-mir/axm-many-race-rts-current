# Phase 24 Action Report

## Implemented

- Added `src/visualDepthPatch.js` as an additive visual layer on top of the existing roster and defense visual systems.
- Added role-aware silhouette detail for Line, Ranged, Mobile and Siege formations.
- Added weapon-language-aware ranged kits: conventional projectile kit for Ironvale/Ashwind, sling ammunition for Greenwake, and crystal emitters for Prismkin.
- Added Scout observation-glass and Support halo cues when the existing unit metadata requests them.
- Added faction-specific member identity for Ironvale, Greenwake, Ashwind and Prismkin.
- Kept enemy Phase-24 additions on a hostile palette while preserving faction-specific shapes.
- Added richer Economy, Military and Defense building details while preserving their existing base geometry.
- Added faction-specific structural language to ordinary buildings.
- Added final Wall/Gate braces, plates and gate crests after the fortification system constructs its final geometry.
- Added capital perimeter details, standards and faction-specific crown silhouettes.
- Added founder cape, shoulder and crest detail.
- Reused existing `spin`, `pulse` and `wave` animation hooks instead of adding another animation loop.
- Installed the visual-depth patch after fortification creation and before Fog/Multi-seat wrappers so later spawn paths inherit the enhanced visuals.

## Preserved

- Existing unit-specific weapons and accessories.
- Existing roster animation layer.
- Existing Phase-19 defense-unit visuals.
- Existing Wall/Gate geometry and movement rules.
- Phase-20/21 battlefield LOS.
- Phase-22 cliff movement.
- Phase-23 painted-surface movement.
- All unit/building/faction stats and costs.

## Source audit

The import/wrapper chain was inspected specifically because Wall/Gate construction replaces generated building geometry. Phase 24 is therefore installed after `fortificationPatch.js`, which allows it to decorate the final fortification result instead of creating details that would later be hidden.

Fog of War and multi-seat spawning were also inspected. Both wrap and call the previous spawn functions, so importing Phase 24 before them keeps the visual additions in those later execution paths.

### Source-audit repair 1 — actual soldiers vs group-level props

The first Phase-24 draft identified formation members with `child.isGroup`. At this point in the existing visual chain, formations can also contain group-level props such as siege rams, orbit pivots and other animated attachments. That broad filter could have decorated a prop as if it were a soldier.

The member filter was tightened before merge to require the original soldier `walkParts` marker. This keeps role/faction body detail on actual formation members while leaving existing group-level props untouched.

### Source-audit repair 2 — ranged semantics and enemy palette

The first generic Ranged pass used quiver/arrow language for every faction. That conflicted with Greenwake Slingers and Prismkin Refractors. The ranged layer was specialized so Greenwake uses sling-ammunition language and Prismkin uses crystal emitters, while conventional projectile kits remain on factions where they fit.

The same audit also threaded the `enemy` state through unit visual detail and changed Phase-24 hostile accents to a dedicated enemy palette. Enemy formations can therefore retain faction silhouette identity without accidentally gaining friendly-looking accessory colors from this new layer.

## Explicit non-goals

- No balance changes.
- No new units/buildings.
- No texture pipeline or external asset dependency.
- No realistic/high-poly renderer replacement.
- No gameplay collision changes from decorative meshes.
- No local/browser runtime-success claim from this environment.

## Verification state

Implemented and source-audited on the Phase-24 branch.

Local/browser rendering remains unverified until Mike/local runs the merged build.

## Local verification targets

1. unit silhouettes remain readable from normal RTS camera distance;
2. new details do not obscure old unit-specific weapons;
3. Greenwake/Prismkin ranged additions match their existing weapon language;
4. economy/military/defense roles are visually distinguishable;
5. all four faction identities remain clear while enemy additions remain hostile-looking;
6. Wall/Gate decorative pieces remain attached while gate doors animate;
7. founder additions do not visibly clip during movement;
8. capital crowns and banners animate correctly;
9. fog and extra multi-seat factions inherit the same parent/visual behavior;
10. added geometry does not create unacceptable frame-time cost.
