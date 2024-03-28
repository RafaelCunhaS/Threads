'use server'

import { revalidatePath } from 'next/cache'
import Thread from '../models/thread.model'
import User from '../models/user.model'
import { connectToDB } from '../mongoose'

interface Params {
  text: string
  author: string
  communityId: string | null
  path: string
}

export async function CreateThread({ text, author, communityId, path }: Params) {
  try {
    connectToDB()

    const createdThread = await Thread.create({
      text,
      author: author.toString(),
      community: null
    })

    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id.toString() }
    })

    revalidatePath(path)
  } catch (error: any) {
    throw new Error(`Error creating thread: ${error.message}`)
  }
}

export async function fetchThreads(pageNumber = 1, pageSize = 20) {
  try {
    connectToDB()

    const skipAmount = (pageNumber - 1) * pageSize

    const threadsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
      .sort({ createdAt: 'desc' })
      .skip(skipAmount)
      .limit(pageSize)
      .populate({ path: 'author', model: User })
      .populate({
        path: 'children',
        populate: { path: 'author', model: User, select: '_id name parentId image' }
      })

    const totalThreadsCount = await Thread.countDocuments({ parentId: { $in: [null, undefined] } })
    const threads = await threadsQuery.exec()
    const isNext = totalThreadsCount > skipAmount + threads.length

    return { threads, isNext }
  } catch (error: any) {
    throw new Error(`Error fetching threads: ${error.message}`)
  }
}

export async function fetchThreadById(id: string) {
  try {
    connectToDB()

    const thread = await Thread.findById(id)
      .populate({ path: 'author', model: User, select: '_id id name image' })
      .populate({
        path: 'children',
        populate: [
          { path: 'author', model: User, select: '_id id name parentId image' },
          {
            path: 'children',
            model: Thread,
            populate: { path: 'author', model: User, select: '_id id name parentId image' }
          }
        ]
      })

    return thread
  } catch (error: any) {
    throw new Error(`Error fetching thread by ID: ${error.message}`)
  }
}

export async function addCommentToThread(
  threadId: string,
  commentText: string,
  userId: string,
  path: string
) {
  try {
    connectToDB()

    const originalThread = await fetchThreadById(threadId)
    if (!originalThread) {
      throw new Error('Thread not found')
    }

    const commentThread = new Thread({
      text: commentText,
      author: userId,
      parentId: threadId
    })
    const savedCommentThread = await commentThread.save()

    originalThread.children.push(savedCommentThread._id)
    await originalThread.save()

    revalidatePath(path)
  } catch (error: any) {
    throw new Error(`Error adding comment to thread: ${error.message}`)
  }
}
