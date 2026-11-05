import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
test('aucune collecte de coordonnées avant activation du backend',()=>{assert.doesNotMatch(page, /type=["'](?:password|email)["']/);assert.match(page,/Aucun e-mail ni mot de passe n’est collecté/)});
test('les liens des sections principales ont des cibles',()=>{for(const name of ['approche','mentors','play','parcours','faq']){assert.ok(page.includes(`id="${name}"`),name)}});
function luminance(hex){const c=hex.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function ratio(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
test('contraste AA des principaux textes et boutons',()=>{for(const[a,b]of [['263747','ffffff'],['526477','ffffff'],['ffffff','087655'],['e1e7ee','172235'],['b9c6d5','172235'],['172235','64dfba'],['123b66','e8b44d']])assert.ok(ratio(a,b)>=4.5,`${a}/${b}: ${ratio(a,b)}`)});
test('réduction des animations et clavier',()=>{assert.match(css,/prefers-reduced-motion/);assert.match(css,/:focus-visible/);assert.match(page,/Aller au contenu/)});
