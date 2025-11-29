import React from 'react'
import { createRoot } from 'react-dom/client'
import MarkdownIt from 'markdown-it'
import App from './App.jsx'
import { createThemeManager } from './themeManager.js'
import { wikiLinkPlugin } from './utils/wikiLinkPlugin.js'

const WIKI_LINK_PLUGIN_FLAG = Symbol('pearl.markdown.wikilinks')

export function renderPearlApp ({
  container,
  pearl,
  uiLog,
  themeManager: providedThemeManager,
  markdown: providedMarkdown
}) {
  const themeManager = providedThemeManager ?? createThemeManager(uiLog)
  if (!providedThemeManager) {
    themeManager.init()
  }

  const markdown =
    providedMarkdown ??
    new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true
    })

  if (!markdown[WIKI_LINK_PLUGIN_FLAG]) {
    markdown.use(wikiLinkPlugin, {
      getHref: (target) => buildWikiHref(target),
      className: 'wikilink'
    })
    Object.defineProperty(markdown, WIKI_LINK_PLUGIN_FLAG, {
      value: true,
      enumerable: false,
      configurable: false
    })
  }

  const originalImageRule = markdown.renderer.rules.image
    ? markdown.renderer.rules.image.bind(markdown.renderer.rules)
    : null
  markdown.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const src = token.attrGet('src') || ''
    const isInlineAsset = /^data:/i.test(src) || /^blob:/i.test(src)
    if (!isInlineAsset) {
      return ''
    }
    if (originalImageRule) {
      return originalImageRule(tokens, idx, options, env, self)
    }
    return self.renderToken(tokens, idx, options)
  }

  const root = createRoot(container)
  root.render(
    <App
      pearl={pearl}
      themeManager={themeManager}
      markdown={markdown}
      uiLog={uiLog}
    />
  )

  return {
    destroy: () => root.unmount()
  }
}

function buildWikiHref (target = '') {
  const cleaned = String(target ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  return `#note/${encodeURIComponent(cleaned)}`
}

