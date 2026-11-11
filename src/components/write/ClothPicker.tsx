import { CLOTHS } from "@/lib/cloth";
import s from "./write.module.css";

export function ClothPicker({ value }: { value: string }) {
  return (
    <fieldset className={s.cloths}>
      <legend className={`${s.legend} visually-hidden`}>Cloth colour</legend>
      {Object.values(CLOTHS).map((c) => (
        <label key={c.id} className={s.swatch} style={{ background: c.cloth }} title={c.name}>
          <input type="radio" name="cloth" value={c.id} defaultChecked={value === c.id} aria-label={c.name} />
        </label>
      ))}
    </fieldset>
  );
}
