export default function PackageSportChoices({ groups, choices, onChange, disabled }) {
  return groups.map((group) => <fieldset className="member-renewal-sports" key={group.id} disabled={disabled}>
    <legend>{group.name} — chọn {group.requiredSelection} môn</legend>
    {group.description && <p>{group.description}</p>}
    {group.sports.map((sport) => {
      const selected = choices.find((choice) => choice.choiceGroupId === group.id)?.sportIds || []
      const checked = selected.includes(sport.id)
      return <label key={sport.id}><input type="checkbox" checked={checked}
        disabled={!checked && selected.length >= group.requiredSelection}
        onChange={() => onChange((current) => current.map((choice) => choice.choiceGroupId === group.id
          ? { ...choice, sportIds: checked ? selected.filter((id) => id !== sport.id) : [...selected, sport.id] } : choice))} />{sport.name}</label>
    })}
  </fieldset>)
}
