const express = require('express');
const app = express();

const cookieParser = require('cookie-parser');
app.use(cookieParser());


const Jimp = require('jimp');


const CONFIG = {
    maxSteps: 9 // change HTML accordingly!!
}

// sessions need to be expired, or at least they should be
const SESSIONS = {

};

// very simple session generator
const genRanHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/*
Load random image from unsplash, split it into 9 parts of equal size.
Return as array of base64 data urls
*/
function generateCaptcha(){
    return new Promise(async(resolve, reject)=>{

        let res = [];

        let image = await Jimp.read({
            url: 'https://source.unsplash.com/random/300x300',
        });

        for(let i = 0; i < 9; i++){

            let img = image.clone();

            let size = 100;

            let x = (i % 3) * size;
            let y = Math.floor(i / 3) * size;

            let crop = img.crop( x, y, size, size );

            let b64 = await crop.getBase64Async(Jimp.MIME_PNG);

            res.push(b64);

        }

        resolve(res);


    })

}

// Load html and generate session
app.get('/', (req, res)=>{

    let csess = genRanHex(16);

    console.log('gen', csess);

    SESSIONS[csess] = null;

    res.cookie('csess', csess);
    res.sendFile('./public/index.html', {root: __dirname});
});

// Generate captcha and css, store solution in session
app.get('/generate_captcha.css', async(req, res)=>{

    var csess = req.cookies.csess;

    console.log(csess);

    if(!csess){
        res.send('');
        return;
    }

    let css = '';


    var nums = "012345678";


    var correct_order = shuffle(nums.split(''));

    var images = await generateCaptcha();

    var sorted_images = [];

    for(let i = 0; i < 9; i++){
        sorted_images.push(images[correct_order[i]]);
    }

    for(let i = 0; i < 9; i++){
        css += `.imageContainer>div:nth-child(${i+1}){background-image:url('${sorted_images[i]}')}\n`;
    }

    css += '\n';

    // minimum is 1! (because next0 is lowest)
    let correct_index = SESSIONS[csess] = Math.floor(Math.random() * (CONFIG.maxSteps - 1)) + 1; // 1 < x < CONFIG.maxSteps

    SESSIONS[csess] = correct_index;

    for(let j = 0; j < CONFIG.maxSteps; j++){

        let order;

        if(correct_index === j){
            order = correct_order;
        }else{
            order = shuffle(nums.split(''));
        }
    
        for(let i = 1; i <= 9; i++){
            css += "*:checked + ".repeat(j) + `.imageContainer>div:nth-child(${i}){order:${order[i-1]};}\n`;
        }
    
        css += "\n";
    
    }


    res.setHeader('Content-Type', 'text/css');
    res.send(css);

})

/*
check given solution with stored, correct solution of session
if correct, redirect to somewhere else
*/

app.get('/redirect', (req, res)=>{

    var csess = req.cookies.csess;

    console.log(csess);

    if(!csess){
        res.status(401).send('Invalid Session!');
        return;
    }

    // prone to errors, simply catch and ignore. set default choice, which is 0
    try{
        let selected = Object.keys(req.query).map((p)=>{

            if(!p.startsWith('next')){
                return '-1'
            }
    
            return parseInt(p.replace('next', ''));
    
        });
    
        var index_choice = Math.max(...selected);
    }catch(e){ // parameters are empty?
        console.error(e);
        var index_choice = 0;
    }

    if(index_choice < 0){
        index_choice = 0;
    }

    if(SESSIONS[csess] !== index_choice){
        // incorrect answer
        res.status(401).send('Incorrect Answer!');
        return;
    }

    // correct answer
    res.redirect('https://github.com');

})

app.listen(80);