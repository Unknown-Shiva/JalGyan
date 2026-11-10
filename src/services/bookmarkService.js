import { demoArticles } from '../data/demoData'

let saved = ['a1', 'a3']
export const bookmarkService = {
  async list() { return demoArticles.filter(article => saved.includes(article.id)) },
  async toggle(id) {
    saved = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id]
    return saved.includes(id)
  },
  async has(id) { return saved.includes(id) }
}
