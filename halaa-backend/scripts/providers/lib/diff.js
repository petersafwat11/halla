function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !["generatedAt", "exportedAt", "observedAt"].includes(key))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
}

function compare(expected, actual, currentPath = "$") {
  if (Object.is(expected, actual)) return [];

  if (Array.isArray(expected) && Array.isArray(actual)) {
    const expectedStable = stable(expected);
    const actualStable = stable(actual);
    const maximum = Math.max(expectedStable.length, actualStable.length);
    return Array.from({ length: maximum }, (_, index) =>
      compare(expectedStable[index], actualStable[index], `${currentPath}[${index}]`),
    ).flat();
  }

  if (
    expected &&
    actual &&
    typeof expected === "object" &&
    typeof actual === "object" &&
    !Array.isArray(expected) &&
    !Array.isArray(actual)
  ) {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
    return keys.flatMap((key) => compare(expected[key], actual[key], `${currentPath}.${key}`));
  }

  return [{ path: currentPath, expected: expected ?? null, actual: actual ?? null }];
}

function diffProvider(expectedState, actualState, provider) {
  if (!expectedState[provider]) throw new Error(`Unknown provider: ${provider}`);
  const actualProviderState = actualState[provider] || actualState;
  const differences = compare(stable(expectedState[provider]), stable(actualProviderState));
  return {
    provider,
    clean: differences.length === 0,
    differenceCount: differences.length,
    differences,
  };
}

module.exports = { stable, compare, diffProvider };
