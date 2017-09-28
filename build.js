const axios = require('axios');
const yaml = require('js-yaml');
const fs = require('fs');
const {URL} = require('url');

function spec(url) {
    return new Promise(resolve => {
        axios.get(url).then(res => resolve(res)).catch(res => resolve(res))
    });
}

const dupes = {};

axios.get('http://apis.io/api/apis?limit=2500').then(res => {
    let list = res.data.data.filter(d =>
        (d.properties || []).concat(d.urls || []).filter(f => f.type.toLowerCase() === 'swagger').length
    ).map(d => ({
        name: d.name,
        description: d.description,
        url: (new URL((d.properties || []).concat(d.urls || []).filter(f => f.type.toLowerCase() === 'swagger')[0].url)).href
    })).filter(p => {
        if (dupes[p.url]) {
            return false
        } else {
            dupes[p.url] = true;
            return true
        }
    });

    fs.writeFileSync('unfiltered.json', JSON.stringify(list, null, 2));

    Promise.all(list.map(u => {
        return spec(u.url)
    })).then(arr => {
        list = list.filter((v, i) => {
            if (arr[i] && arr[i].data) {
                if (arr[i].data.swagger || arr[i].data.openapi) {
                    return true;
                } else if (typeof arr[i].data === 'string'
                    && (arr[i].headers['content-type'].toLowerCase().indexOf('yaml') > -1
                        || v.url.indexOf('.yaml') > -1)) {
                    try {
                        arr[i].data = yaml.load(arr[i].data);
                        return arr[i].data.swagger || arr[i].data.openapi
                    } catch (ign) {
                        return false
                    }
                }
            }

            return false
        });

        fs.writeFileSync('index.json', JSON.stringify(list, null, 2));
    });
});
