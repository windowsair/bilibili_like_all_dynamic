const axios = require('axios')
const to = require('await-to-js').default
const qs = require('qs')


let config = {
    cookie: {
        sid: '',
        DedeUserID: '',
        DedeUserID__ckMd5: '',
        SESSDATA: '',
        bili_jct: '',
    },
    like_uid: 672328094
}



let getCookie = () => {
    let getField = (name) => {
        const c = config.cookie
        return `${name}=${c[name]};`
    }

    let str = ''
    str += getField('sid')
    str += getField('DedeUserID')
    str += getField('DedeUserID__ckMd5')
    str += getField('SESSDATA')
    str += getField('bili_jct')
    return str
}

let getCSRF = (cookie) => {
    let bilibili_csrf = {
        get: (t, str) => {
            let e = '' + str, n = e.indexOf(t + '=')
            if (- 1 == n || '' == t) return ''
            let r = e.indexOf(';', n)
            return - 1 == r && (r = e.length), unescape(e.substring(n + t.length + 1, r))
        }
    }
    return bilibili_csrf.get('bili_jct', cookie) || ''
}


let getDynamicList = async (offset, cookie) => {
    let res, err
    let req = {
        method: 'get',
        url: `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history?visitor_uid=${config.cookie.DedeUserID}` +
            `&host_uid=${config.like_uid}&` + `offset_dynamic_id=${offset}&need_top=1&platform=web`,
        headers: {
            'authority': 'api.vc.bilibili.com',
            'accept': 'application/json, text/plain, */*',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
            'sec-fetch-site': 'same-site',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'cookie': cookie
        }
    }

    ;[err, res] = await to(axios(req))
    if (err) {
        throw err
    }

    res = res.data.data
    let dynamicList = []
    let { has_more, next_offset } = res
    let all_liked = false
    if (res.cards) {
        for (let item of res.cards) {
            if (!item.desc.is_liked)
                dynamicList.push(item.desc.dynamic_id_str)
        }
        all_liked = dynamicList.length == 0 && res.cards.length > 0
    }
    return { has_more: has_more, next_offset: next_offset, dynamicList: dynamicList, all_liked: all_liked }
}


let likeDynamic = async (dynamic_id, cookie, csrf) => {
    let err, res

    let data = qs.stringify({
        'uid': config.cookie.DedeUserID,
        'dynamic_id': dynamic_id,
        'up': '1', // like
        'csrf_token': csrf,
        'csrf': csrf
    })

    let req = {
        method: 'post',
        url: 'https://api.vc.bilibili.com/dynamic_like/v1/dynamic_like/thumb',
        headers: {
            'authority': 'api.vc.bilibili.com',
            'accept': 'application/json, text/plain, */*',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
            'content-type': 'application/x-www-form-urlencoded',
            'sec-fetch-site': 'same-site',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'cookie': cookie
        },
        data: data
    }

    ;[err, res] = await to(axios(req))
    if (err) {
        throw err
    }

    if (res.data.code != 0) {
        console.table(res.data)
        throw "Error: Maybe the cookie is wrong"
    }
}

let sleep = async () => {
    return new Promise(resolve => {
        setTimeout(() => resolve(''), 30 * 1000) // 30s
    })
}


let mainThread = async () => {
    const cookie = getCookie()
    const csrf = getCSRF(cookie)


    let offset = 0, flag
    do {
        let { has_more, next_offset, dynamicList, all_liked } = await getDynamicList(offset, cookie)

        if (dynamicList.length > 0) {
            for (let id of dynamicList) {
                console.log(`[info]id:${id}`)
                await likeDynamic(id, cookie, csrf)
                await sleep()
            }
        }

        if (all_liked) {
            if (offset == next_offset) {
                break
            }
            offset = next_offset
            console.log(`[info]offset:${next_offset}`)
        }

        flag = has_more
    } while (flag)

    console.log('done.')
}

mainThread()
