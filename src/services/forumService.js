import { demoPosts } from '../data/demoData'
import { apiRequest } from './api'

let posts = [...demoPosts]

export const forumService = {
  async list() { return posts },
  async get(id) { return posts.find(post => post.id === id) || null },
  async create(payload, user) {
    const post = {
      id: `p${Date.now()}`, ...payload, author: user?.name || 'You',
      initials: (user?.name || 'You').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase(),
      time: 'Just now', location: user?.location || 'India', votes: 0, comments: 0, commentsList: []
    }
    posts = [post, ...posts]
    return post
  },
  async vote(id) {
    posts = posts.map(post => post.id === id ? { ...post, votes: post.votes + 1 } : post)
    return posts.find(post => post.id === id)
  },
  async comment(id, text, user) {
    const comment = { id: `c${Date.now()}`, author: user?.name || 'You', initials: (user?.name || 'You').split(' ').map(x => x[0]).join('').slice(0,2).toUpperCase(), time: 'Just now', text, replies: [] }
    posts = posts.map(post => post.id === id ? { ...post, comments: post.comments + 1, commentsList: [...(post.commentsList || []), comment] } : post)
    return comment
  }
}
