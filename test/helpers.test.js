let getCssSelector, getXPath;

beforeAll(async () => {
  const mod = await import('../extension/modules/helpers.js');
  getCssSelector = mod.getCssSelector;
  getXPath = mod.getXPath;
});

describe('helpers', () => {
  test('getCssSelector returns a simple selector', () => {
    document.body.innerHTML = '<div id="c"><span></span><span class="foo"></span></div>';
    const span = document.querySelector('.foo');
    expect(getCssSelector(span)).toBe('div#c > span:nth-of-type(2)');
  });

  test('getXPath returns an xpath to the element', () => {
    document.body.innerHTML = '<div><p></p><p></p></div>';
    const el = document.querySelectorAll('p')[1];
    expect(getXPath(el)).toMatch(/\/html\[1\]\/body\[1\]\/div\[1\]\/p\[2\]$/);
  });
});
