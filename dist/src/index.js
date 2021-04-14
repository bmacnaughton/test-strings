'use strict';
/**
 * format:
 * '${pattern}${pattern}literal'
 *
 * pattern:
 * substitution-spec<count-spec>   // count-spec is optional
 *
 * substitution-spec:
 * [range-spec]
 * =code-word
 * (choice-spec)
 * literal
 *
 * count-spec:
 * min, max=min  // default when not present <1, 1>
 *
 * range-spec
 * a-zA-Z0       // if - is desired must be first character
 *
 * code-word:
 * base58
 * base64 (nyi)
 * alpha 'A-Za-z'
 * numeric '0-9'
 * alphanumeric 'A-Za-z0-9'
 * hex 'ABCDEFabcdef0123456789'
 *
 * choice-spec:
 * this|that...
 *
 * literal-spec:
 * literal characters    // mostly useful for repeating
 *
 * characters not in a ${pattern} group are literal.
 */
const alpha = decodeRanges('A-Za-z');
const numeric = decodeRanges('0-9');
const alphanumeric = decodeRanges('A-Za-z0-9');
const hex = decodeRanges('a-f0-9');
const HEX = decodeRanges('A-F0-9');
const base58 = decodeRanges('A-HJ-NP-Za-km-z1-9');
const codeWords = {
    alpha,
    numeric,
    alphanumeric,
    hex,
    HEX,
    base58,
};
const specRE = /\$\{(.+?)\}+/g;
function generate(format) {
    const matches = [];
    let match;
    while ((match = specRE.exec(format)) !== null) {
        matches.unshift(match);
    }
    for (let i = 0; i < matches.length; i++) {
        const [full, interior] = matches[i];
        const { index } = matches[i];
        const [spec, min, max] = getMinMax(interior);
        let atoms;
        let type;
        switch (spec[0]) {
            case '[':
                type = 'range-spec';
                atoms = decodeRanges(spec.slice(1, -1));
                break;
            case '=': {
                type = 'code-word';
                const charset = codeWords[spec.slice(1)];
                if (!charset) {
                    throw new Error(`bad code-word: ${spec.slice(1)}`);
                }
                atoms = charset;
                break;
            }
            case '(':
                type = 'choice-spec';
                atoms = spec.slice(1, -1).split('|');
                break;
            default:
                type = 'something-else';
                atoms = [spec];
                break;
        }
        matches[i].spec = { type, full, index, min, max, atoms };
    }
    // generate requested string
    for (let i = 0; i < matches.length; i++) {
        // generate the substitution according to the spec
        const spec = matches[i].spec;
        const sub = makeSubstitution(spec.atoms, spec.min, spec.max);
        const fhead = format.substring(0, spec.index);
        const ftail = format.substring(spec.index + spec.full.length);
        format = fhead + sub + ftail;
    }
    return format;
}
function decodeRanges(range) {
    const chars = [];
    range = range.split('');
    if (range[0] === '-') {
        chars.push(range.shift());
    }
    let lastchar;
    for (let i = 0; i < range.length; i++) {
        if (range[i] !== '-') {
            chars.push(lastchar = range[i]);
        }
        else {
            const start = lastchar.charCodeAt(0) + 1;
            const end = range[i + 1].charCodeAt(0);
            for (let i = start; i <= end; i++) {
                chars.push(String.fromCharCode(i));
            }
            i += 1;
        }
    }
    return [...new Set(chars)];
}
const sizeRE = /\<(\d+)(?:, *(\d+))?\>$/;
function getMinMax(spec) {
    const m = spec.match(sizeRE);
    if (!m) {
        return [spec, 1, 1];
    }
    // there has to be a min match
    const min = m[1];
    const max = m[2] === undefined ? min : m[2];
    spec = spec.slice(0, -m[0].length);
    return [spec, parseInt(min), parseInt(max)];
}
function makeSubstitution(atoms, min, max) {
    const n = atoms.length - 1;
    const sub = [];
    const iterations = random(min, max);
    for (let i = 0; i < iterations; i++) {
        sub.push(atoms[random(0, n)]);
    }
    return sub.join('');
}
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
module.exports = generate;
