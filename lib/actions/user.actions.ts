'use server'

import { revalidatePath } from 'next/cache'
import User from '../models/user.model'
import { connectToDB } from '../mongoose'
import Thread from '../models/thread.model'
import { FilterQuery, SortOrder } from 'mongoose'

interface UpdateUserParams {
  userId: string
  username: string
  name: string
  image: string
  bio: string
  path: string
}

interface FetchUsersParams {
  userId: string
  searchString: string
  pageSize: number
  pageNumber: number
  sortBy?: SortOrder
}

export async function updateUser({
  userId,
  username,
  name,
  image,
  bio,
  path
}: UpdateUserParams): Promise<void> {
  connectToDB()

  try {
    await User.findOneAndUpdate(
      { id: userId },
      { username: username.toLowerCase(), name, image, bio, onboarded: true },
      { upsert: true }
    )

    if (path === '/profile/edit') {
      revalidatePath(path)
    }
  } catch (error: any) {
    throw new Error(`Failed to create/update user: ${error.message}`)
  }
}

export async function fetchUser(userId: string) {
  try {
    connectToDB()
    return await User.findOne({ id: userId })
  } catch (error: any) {
    throw new Error(`Failed to fetch user: ${error.message}`)
  }
}

export async function fetchUserThreads(userId: string) {
  try {
    connectToDB()

    const threads = await User.findOne({ _id: userId }).populate({
      path: 'threads',
      model: Thread,
      populate: {
        path: 'children',
        model: Thread,
        populate: { path: 'author', model: User, select: 'name image id' }
      }
    })
    return threads
  } catch (error: any) {
    throw new Error(`Failed to fetch user threads: ${error.message}`)
  }
}

export async function fetchUsers({
  userId,
  searchString = '',
  pageNumber = 1,
  pageSize = 20,
  sortBy = 'desc'
}: FetchUsersParams) {
  try {
    connectToDB()

    const skipAmount = (pageNumber - 1) * pageSize

    const regex = new RegExp(searchString, 'i')

    const query: FilterQuery<typeof User> = {
      id: { $ne: userId }
    }

    if (searchString.trim() !== '') {
      query.$or = [{ username: { $regex: regex } }, { name: { $regex: regex } }]
    }

    const sortOptions = { createdAt: sortBy }

    const usersQuery = User.find(query).sort(sortOptions).skip(skipAmount).limit(pageSize)

    const totalUsers = await User.countDocuments(query)
    const users = await usersQuery.exec()
    const isNext = totalUsers > skipAmount + users.length

    return { users, isNext }
  } catch (error: any) {
    throw new Error(`Failed to fetch users: ${error.message}`)
  }
}

export async function fetchActivity(userId: string) {
  try {
    connectToDB()

    const userThreads = await Thread.find({ author: userId })

    const childThreadId = userThreads.reduce((acc, thread) => acc.concat(thread.children), [])

    const replies = await Thread.find({
      _id: { $in: childThreadId },
      author: { $ne: userId }
    }).populate({ path: 'author', model: User, select: 'name image _id' })

    return replies
  } catch (error: any) {
    throw new Error(`Failed to fetch activity: ${error.message}`)
  }
}
