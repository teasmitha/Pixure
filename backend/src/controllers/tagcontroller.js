import Hashtag from '../models/hashtags.js';
import { extractPostsFromList } from './postcontroller.js';
import { extractOwnerInfo } from './usercontroller.js';
import { logger } from '../utils/logger.js';

//Storing Post References Based On Tags for better Search
export const tagPost = async (req, res) => {
    try {
        let postId = req.body.postId;
        let tags = req.body.tags;

        for (const tag of tags) {
            let existingHashtag = await Hashtag.findOne({ name: tag });

            if (existingHashtag) {
                existingHashtag.images.push(postId);
                await existingHashtag.save();
                logger.info({message : "New Hashtag",type : tag});
            } else {
                const newHashtag = new Hashtag({
                    name: tag,
                    images: [postId],
                });
                await newHashtag.save();
                logger.info({message : "New Hashtag Post",type : tag});
            }
        }

        res.status(200).json({ message: 'Post Added Succesfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong' });
        logger.error({ message: `Add Post`, type: `${error}`,db : "Tag" });
    }
};

//Returns Results of Hastags
export const searchHashtagsByName = async (req, res) => {
    try {
        const startTime = Date.now();
        let tag = req.query.tag;
        let uid = req.body.userId;

        //Pattern Searching
        const regex = new RegExp(tag, 'i');
        const matchingHashtags = await Hashtag.find({ name: { $regex: regex } });

        //Extracting Post Ids
        let postIds = [];
        for (const hashtag of matchingHashtags) {
            postIds = postIds.concat(hashtag.images);
        }

        //Post Id -> Post with Raw Info -> Post With Right Info
        let posts = await extractPostsFromList(postIds);
        let filteredPosts = posts.filter(post => post.owner !== uid);
        let modifiedPosts = await extractOwnerInfo(filteredPosts);

        const endTime = Date.now();
        const processingTime = endTime - startTime;
        logger.info({message : "HashTag Search",type : tag,time : processingTime});

        res.status(200).json({ posts: modifiedPosts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong' });
        logger.error({ message: `Hastag Search`, type: `${error}` });
    }
};

// Removes References of the post in tags
export const removePostReferences = async (req, res) => {
    try {
        const postTags = req.body.tags;
        const postId = req.body.postId;

        // Iterate through each tag & Remove References
        for (const tag of postTags) {
            const hashtag = await Hashtag.findOne({ name: tag });

            if (hashtag) {
                hashtag.images = hashtag.images.filter(imageId => imageId !== postId);
                await hashtag.save();
            }
        }

        res.status(200).json({ message: 'Post references removed successfully from tags' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong' });
        logger.error({ message: `Delete Post`, type: `${error}`, db : "Tag"});
    }
};