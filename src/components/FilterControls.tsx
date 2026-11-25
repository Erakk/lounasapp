import { useShallow } from 'zustand/react/shallow';
import { PRICE_OPTIONS, WALK_OPTIONS } from '../domain/filters';
import { DIETS, FORMATS } from '../domain/schema';
import { selectFilters, useFilters } from '../state/filterStore';
import { GroupStepper, Segmented, SubHeading, Switch, Toggle } from './SettingsControls';
import { fi } from '../i18n/fi';

/** Every filter shared by the list, the map and the random pick (the area has its own section). */
export function FilterControls() {
  const f = useFilters(useShallow(selectFilters));
  const { set, toggleFormat, toggleDiet } = useFilters(useShallow((s) => ({ set: s.set, toggleFormat: s.toggleFormat, toggleDiet: s.toggleDiet })));

  return (
    <>
      <SubHeading>{fi.filters.sections.group}</SubHeading>
      <GroupStepper value={f.groupSize} onChange={(groupSize) => set({ groupSize })} />

      <SubHeading>{fi.filters.sections.walk}</SubHeading>
      <Segmented
        options={[null, ...WALK_OPTIONS]}
        value={f.maxWalk}
        label={(v) => (v === null ? fi.filters.any : `${v} min`)}
        onChange={(maxWalk) => set({ maxWalk })}
        ariaLabel={fi.filters.sections.walk}
      />

      <SubHeading>{fi.filters.sections.price}</SubHeading>
      <Segmented
        options={[null, ...PRICE_OPTIONS]}
        value={f.maxPrice}
        label={(v) => (v === null ? fi.filters.any : `${v} €`)}
        onChange={(maxPrice) => set({ maxPrice })}
        ariaLabel={fi.filters.sections.price}
      />
      <p className="mt-1.5 text-xs text-ink-3">{fi.filters.priceUnknownNote}</p>

      <SubHeading>{fi.filters.sections.format}</SubHeading>
      <div className="flex flex-wrap gap-2">
        {FORMATS.map((fmt) => (
          <Toggle key={fmt} on={f.formats.includes(fmt)} onClick={() => toggleFormat(fmt)}>
            {fi.formats[fmt]}
          </Toggle>
        ))}
      </div>

      <SubHeading>{fi.filters.sections.diet}</SubHeading>
      <div className="flex flex-wrap gap-2">
        {DIETS.map((d) => (
          <Toggle key={d} on={f.diets.includes(d)} onClick={() => toggleDiet(d)}>
            {fi.diets[d]}
          </Toggle>
        ))}
      </div>

      <SubHeading>{fi.filters.sections.other}</SubHeading>
      <Switch label={fi.filters.openNow} checked={f.openNow} onChange={(openNow) => set({ openNow })} />
      <Switch label={fi.filters.favouritesOnly} checked={f.favouritesOnly} onChange={(favouritesOnly) => set({ favouritesOnly })} />
      <Switch label={fi.filters.hideHighRisk} hint={fi.filters.hideHighRiskHint} checked={f.hideHighRisk} onChange={(hideHighRisk) => set({ hideHighRisk })} />
      <Switch label={fi.filters.verifiedPriceOnly} checked={f.verifiedPriceOnly} onChange={(verifiedPriceOnly) => set({ verifiedPriceOnly })} />
      <Switch
        label={fi.filters.showUnverified}
        hint={fi.filters.showUnverifiedHint}
        checked={f.showUnverified}
        onChange={(showUnverified) => set({ showUnverified })}
      />
      <Switch label={fi.filters.showHidden} checked={f.showHidden} onChange={(showHidden) => set({ showHidden })} />
    </>
  );
}
