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

    const threadsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
      .sort({ createdAt: 'desc' })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .populate({ path: 'author', model: User })
      .populate({
        path: 'children',
        populate: { path: 'author', model: User, select: '_id name parentId image' }
      })

    const totalThreadsCount = await Thread.countDocuments({ parentId: { $in: [null, undefined] } })
    const threads = await threadsQuery.exec()
    const isNext = totalThreadsCount > pageNumber * pageSize + threads.length

    return { threads, isNext }
  } catch (error: any) {
    throw new Error(`Error fetching threads: ${error.message}`)
  }
}