export const LINKED_GAME_FIELDS = [
  ['version','GAME VERSION'],['name','LIST OF GAMES'],['manufacturer','MANUFACTURER'],['denomination','DENOMINATION'],
  ['gameType','GAME TYPE'],['lines','NO. OF LINES'],['betMin','BET MINIMUM','number'],['betMax','BET MAXIMUM','number'],
  ['maxPrize','MAX PRIZE','number'],['maxPrizeMultiplier','MAX PRIZE MULTIPLIER','number'],
  ['progressiveJackpotGroup','PROGRESSIVE JACKPOT GROUP'],['jackpotRangeMin','JACKPOT RANGE MIN'],['jackpotRangeMax','JACKPOT RANGE MAX'],
  ['jackpotRtpReserve','JACKPOT RTP RESERVE %'],['jackpotRtpIncrement','JACKPOT RTP INCREMENT %'],
  ['totalJackpotRtp','TOTAL JACKPOT RTP %','percent'],['baseGameRtp','BASE GAME RTP %','percent'],['totalPayout','TOTAL PAYOUT %','percent'],
];
export function linkedDefaultValue(game, key) {
  const field = LINKED_GAME_FIELDS.find(field => field[0] === key), raw = String(game[key] ?? '');
  if (field?.[2] === 'percent' && raw.trim() && !raw.includes('%') && Number.isFinite(Number(raw))) {
    const value = Number(raw); return String(Math.abs(value) <= 1 ? Number((value * 100).toFixed(8)) : value) + '%';
  }
  return raw;
}
export function createFieldRule(game, key) {
  return { defaultValue: linkedDefaultValue(game, key), defaultExcludedGroupIds: [], variants: [] };
}
export function assignFieldGroup(rule, index, groupId, checked) {
  const before = rule.variants.find(item => item.groupIds.includes(groupId))?.value ?? rule.defaultValue;
  rule.defaultExcludedGroupIds = [...new Set(rule.defaultExcludedGroupIds || [])];
  if (index === -1) {
    if (checked) rule.variants.forEach(item => { item.groupIds = item.groupIds.filter(id => id !== groupId); });
    rule.defaultExcludedGroupIds = checked ? rule.defaultExcludedGroupIds.filter(id => id !== groupId)
      : [...new Set([...rule.defaultExcludedGroupIds, groupId])];
  } else if (checked) {
    rule.variants.forEach(item => { item.groupIds = item.groupIds.filter(id => id !== groupId); });
    rule.variants[index].groupIds.push(groupId);
    rule.defaultExcludedGroupIds = [...new Set([...rule.defaultExcludedGroupIds, groupId])];
  } else {
    rule.variants[index].groupIds = rule.variants[index].groupIds.filter(id => id !== groupId);
    rule.defaultExcludedGroupIds = rule.defaultExcludedGroupIds.filter(id => id !== groupId);
  }
  return before;
}
export function normalizeFieldRules(input, groups) {
  const known = new Set(groups.map(group => group.id)), result = {};
  if (known.size > 400) throw Error('群組數超過 400，請聯絡管理者');
  for (const [key, rule] of Object.entries(input || {})) {
    const field = LINKED_GAME_FIELDS.find(field => field[0] === key);
    if (!field) throw Error('不支援的連動欄位：' + key);
    const clean = value => {
      const text = String(value ?? '').trim();
      if (text.length > 2000) throw Error(field[1] + ' 的內容上限 2000 字元');
      if (text && field[2]) {
        const numeric = text.replace(/,/g, '').replace(field[2] === 'percent' ? /%$/ : /$^/, '');
        const number = /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(numeric) ? Number(numeric) : NaN;
        if (!Number.isFinite(number) || number < 0 || (field[2] === 'percent' && number > 100)) throw Error(field[1] + ' 請填入有效' + (field[2] === 'percent' ? '百分比（0–100）' : '非負數'));
        return String(number) + (field[2] === 'percent' ? '%' : '');
      }
      return text;
    };
    const ids = values => {
      if (!Array.isArray(values) || values.some(id => !known.has(id))) throw Error('群組資料已變更，請關閉後重新開啟');
      return [...new Set(values)];
    };
    if (!Array.isArray(rule.variants) || rule.variants.length > 20) throw Error('每個欄位最多 20 組額外數值');
    const seen = new Set(), excluded = new Set(ids(rule.defaultExcludedGroupIds || []));
    const variants = rule.variants.map(item => {
      const groupIds = ids(item.groupIds), value = clean(item.value);
      if (!value || !groupIds.length) throw Error(field[1] + '：每組數值都需填值並勾選群組');
      for (const id of groupIds) { if (seen.has(id)) throw Error(field[1] + '：同一群組不能重複指定數值'); seen.add(id); excluded.add(id); }
      return { value, groupIds };
    });
    result[key] = { defaultValue: clean(rule.defaultValue), defaultExcludedGroupIds: [...excluded], variants };
  }
  if (JSON.stringify(result).length > 300000) throw Error('欄位設定資料過大，請減少內容');
  return result;
}
export function resolveLinkedValue(base, rule, groupId = null) {
  if (!rule) return base;
  if (groupId === null) return rule.defaultValue;
  const matches = (rule.variants || []).filter(item => item.groupIds?.includes(groupId));
  if (matches.length > 1) return ''; // Never choose an arbitrary value for conflicting legacy data.
  if (matches.length === 1) return matches[0].value;
  return rule.defaultExcludedGroupIds?.includes(groupId) ? '' : rule.defaultValue;
}
export function resolveLinkedGame(game, rules, groupId = null) {
  const result = { ...game };
  for (const [key] of LINKED_GAME_FIELDS) result[key] = resolveLinkedValue(game[key], rules?.[key], groupId);
  return result;
}
export function projectLinkedRow(row, rules, groupId) {
  const result = [...row];
  LINKED_GAME_FIELDS.forEach(([key], index) => { result[index + 1] = resolveLinkedValue(row[index + 1] ?? '', rules?.[key], groupId); });
  return result;
}
