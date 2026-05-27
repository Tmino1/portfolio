function cleanYamlValue(value) {
  const trimmed = value.trim();
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  return quoted ? trimmed.slice(1, -1) : trimmed;
}

export function parseSimpleYamlList(source) {
  const items = [];
  let current = null;

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('- ')) {
      current = {};
      items.push(current);

      const inlineField = line.slice(2);
      if (!inlineField) continue;

      const separator = inlineField.indexOf(':');
      if (separator === -1) continue;

      current[inlineField.slice(0, separator).trim()] = cleanYamlValue(inlineField.slice(separator + 1));
      continue;
    }

    if (!current) continue;

    const separator = line.indexOf(':');
    if (separator === -1) continue;

    current[line.slice(0, separator).trim()] = cleanYamlValue(line.slice(separator + 1));
  }

  return items.filter((item) => item.label && item.href && item.summary);
}
