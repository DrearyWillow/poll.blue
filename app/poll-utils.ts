import { AtpAgent, AppBskyFeedPost, AppBskyRichtextFacet, RichText } from "https://esm.sh/v115/@atproto/api@0.12.2"

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateId(length: number) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return result;
}

export type Enumeration = 'upper' | 'lower' | 'number';

export type Poll = {
    question: string;
    answers: string[];
    enumeration: Enumeration;
}

interface Template {
    text: string;
    link?: string;
    mention?: boolean;
    pollFacet?: string;
    truncate: 'yes' | 'no';
}

interface GenerationOptions {
    visibleId: string;
    poll: Poll;
    replyRef?: AppBskyFeedPost.ReplyRef;
    author: string;
    pollStyle: 'plain' | 'bot'
}

interface PollPost {
    text: string;
    links: AppBskyRichtextFacet.Main[];
    pollFacets: AppBskyRichtextFacet.Main[];
}

export async function generatePollText(options: GenerationOptions, agent: AtpAgent): Promise<PollPost> {
    const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
    const emojiLetters = ['🅰', '🅱', '🅲', '🅳']
    const { visibleId, poll, replyRef, author } = options;
    const postId = replyRef?.parent.uri.split('/').slice(-1)[0];
    let postTemplate: Template[] = [];
    if (options.pollStyle === 'plain') {
        postTemplate = [
            { text: `${poll.question}\n\n`, truncate: 'no' },
        ];
    } else {
        postTemplate = [
            { text: `"${poll.question}"`, truncate: 'no', pollFacet: 'blue.poll.post.facet#question' },
            { text: ` asked by `, truncate: 'yes' },
            { text: `@${author}`, truncate: 'yes' },
            { text: `. Vote below!`, truncate: 'yes' },
            { text: `\n\n`, truncate: 'no' },
        ];
    }
    for (const [i, _answer] of options.poll.answers.entries()) {
        const item = poll.enumeration === 'number' ? emojiNumbers[i] : emojiLetters[i];
        postTemplate.push({ text: `${item} `, truncate: 'no' });
        postTemplate.push({
            text: `${options.poll.answers[i]}`,
            link: `https://poll.blue/p/${visibleId}/${i + 1}`,
            truncate: 'no',
            pollFacet: 'blue.poll.post.facet#option'
        });
        postTemplate.push({ text: '\n', truncate: 'no' });
    }
    postTemplate.push({ text: `\n`, link: undefined, truncate: 'no' });
    postTemplate.push({ text: `📊 Show results`, link: `https://poll.blue/p/${visibleId}/0`, truncate: 'no' });
    let pollPost = await buildTemplate(postTemplate, agent);
    if (!postLengthValid(pollPost.text)) {
        pollPost = await buildTemplate(postTemplate.filter(t => t.truncate === 'no'), agent)
    }
    if (!postLengthValid(pollPost.text)) {
        throw new Error(`post too long: ${pollPost.text.length} bytes`)
    }
    return pollPost;
}

async function buildTemplate(template: Template[], agent: AtpAgent): Promise<PollPost> {
    const links: AppBskyRichtextFacet.Main[] = [];
    let pollFacets: AppBskyRichtextFacet.Main[] = [];
    let questionIndex = 1;
    for (let i = 0, len = 0; i < template.length; len += byteLength(template[i].text), i++) {
        if (template[i].link) {
            links.push({
                index: { byteStart: len, byteEnd: len + byteLength(template[i].text) },
                features: [{
                    $type: 'app.bsky.richtext.facet#link',
                    uri: template[i].link
                }]
            })
        }
        const pollFacet = template[i].pollFacet;
        if (pollFacet) {
            const feature = pollFacet === 'blue.poll.post.facet#question' ?
                { $type: pollFacet } : { $type: pollFacet, number: questionIndex++ };
            pollFacets.push({
                index: { byteStart: len, byteEnd: len + byteLength(template[i].text) },
                features: [feature]
            })
        }
    }
    const text = template.map(t => t.text).join('');

    const rt = new RichText({ text });
    await rt.detectFacets(agent);
    pollFacets = pollFacets.concat(rt.facets || []);

    return { text, links, pollFacets };
}

export function byteLength(s: string): number {
    return (new TextEncoder().encode(s)).length
}

export function postUriToBskyLink(postUri: string) {
    if (!postUri) {
        return "";
    }
    // at://did:plc:hxqb73a2mcqwgyg64ibvw7ts/app.bsky.feed.post/3jtiwzc4lfh2o
    const [did, , post] = postUri.split("/").slice(-3);
    return `https://bsky.app/profile/${did}/post/${post}`;
}

export function postLengthValid(text: string): boolean {
    if (byteLength(text) > 3000) {
        return false;
    }
    if ([...new Intl.Segmenter().segment(text)].length > 300) {
        return false;
    }
    return true;
}
