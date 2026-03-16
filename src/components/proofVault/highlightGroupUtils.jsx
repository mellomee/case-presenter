export function normalizeHighlightGroups(highlights, clippedPage = 1) {
  if (!Array.isArray(highlights) || highlights.length === 0) return [];

  if (Array.isArray(highlights[0]?.highlights)) {
    return highlights.map((group, index) => ({
      id: group.id || `group-${index + 1}`,
      name: group.name || `Group ${index + 1}`,
      page: Number(group.page) || clippedPage || 1,
      highlights: Array.isArray(group.highlights) ? group.highlights : [],
    }));
  }

  return [
    {
      id: 'group-1',
      name: 'Group 1',
      page: clippedPage || 1,
      highlights,
    },
  ];
}

export function flattenHighlightGroupsForPage(highlights, currentPage, clippedPage = 1) {
  return normalizeHighlightGroups(highlights, clippedPage)
    .filter((group) => group.page === currentPage)
    .flatMap((group) =>
      group.highlights.map((highlight, index) => ({
        ...highlight,
        __groupId: group.id,
        __groupName: group.name,
        __highlightIndex: index,
      }))
    );
}

export function countHighlightGroups(highlights, clippedPage = 1) {
  return normalizeHighlightGroups(highlights, clippedPage).length;
}

export function countGroupedHighlights(highlights, clippedPage = 1) {
  return normalizeHighlightGroups(highlights, clippedPage).reduce(
    (total, group) => total + group.highlights.length,
    0
  );
}

export function getInitialHighlightPage(highlights, clippedPage = 1) {
  return normalizeHighlightGroups(highlights, clippedPage)[0]?.page || clippedPage || 1;
}

export function createHighlightGroup(page, index) {
  return {
    id: `group-${Date.now()}-${index + 1}`,
    name: `Group ${index + 1}`,
    page,
    highlights: [],
  };
}