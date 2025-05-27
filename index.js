require('dotenv').config();
const token = process.env.BOT_TOKEN;

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const math = require('mathjs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const commands = [
    new SlashCommandBuilder()
        .setName('analyze')
        .setDescription('Performs statistical analysis on a list of numbers.')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Choose whether the data is a parameter or a statistic')
                .setRequired(true)
                .addChoices(
                    { name: 'parameter', value: 'parameter' },
                    { name: 'statistic', value: 'statistic' }
                )
        ) // ← this closing parenthesis was missing
        .addStringOption(option =>
            option.setName('data')
                .setDescription('Enter numbers separated by letters, spaces, commas, or semicolons')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('regression')
        .setDescription('Performs regression analysis.')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Regression type')
                .setRequired(true)
                .addChoices(
                    { name: 'linear', value: 'linear' },
                    { name: 'quadratic', value: 'quadratic' },
                    { name: 'cubic', value: 'cubic' },
                    { name: 'quartic', value: 'quartic' },
                    { name: 'exponential (base 10)', value: 'exp10' },
                    { name: 'logarithmic (base 10)', value: 'log10' },
                    { name: 'exponential (base e)', value: 'expe' },
                    { name: 'logarithmic (base e)', value: 'loge' }
                )
        )
        .addStringOption(option =>
            option.setName('x_values')
                .setDescription('X values')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('y_values')
                .setDescription('Y values')
                .setRequired(true)
        ),
	new SlashCommandBuilder()
        .setName('cryptanalysis')
        .setDescription('Analyze character frequency of a message')
        .addStringOption(option =>
            option.setName('input')
                .setDescription('The message to analyze')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('atbash')
        .setDescription('Encode or decode a message using Atbash cipher')
        .addStringOption(option =>
            option.setName('input')
                .setDescription('The message to encode/decode')
                .setRequired(true)),
    new SlashCommandBuilder()
    .setName('caesar')
    .setDescription('Encodes or decodes text using the Caesar cipher.')
    .addStringOption(option =>
        option.setName('operation')
            .setDescription('Choose to encode or decode')
            .setRequired(true)
            .addChoices(
                { name: 'encode', value: 'encode' },
                { name: 'decode', value: 'decode' }
            )
    )
    .addStringOption(option =>
        option.setName('input')
            .setDescription('The text to encode or decode')
            .setRequired(true)
    )
    .addIntegerOption(option =>
        option.setName('shift')
            .setDescription('The shift value (optional for decode)')
            .setRequired(false)
    ),
    new SlashCommandBuilder()
        .setName('baconian-24')
        .setDescription('Encode or decode using Baconian cipher (I/J and U/V are the same)')
        .addStringOption(option =>
            option.setName('operation')
                .setDescription('Choose to encode or decode')
                .setRequired(true)
                .addChoices(
                    { name: 'encode', value: 'encode' },
                    { name: 'decode', value: 'decode' }
                ))
        .addStringOption(option =>
            option.setName('input')
                .setDescription('The message to encode/decode')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('baconian-26')
        .setDescription('Encode or decode using Baconian cipher (26 unique letters)')
        .addStringOption(option =>
            option.setName('operation')
                .setDescription('Choose to encode or decode')
                .setRequired(true)
                .addChoices(
                    { name: 'encode', value: 'encode' },
                    { name: 'decode', value: 'decode' }
                ))
        .addStringOption(option =>
            option.setName('input')
                .setDescription('The message to encode/decode')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('binary')
        .setDescription('Encode or decode binary')
        .addStringOption(option =>
            option.setName('operation')
                .setDescription('Choose to encode or decode')
                .setRequired(true)
                .addChoices(
                    { name: 'encode', value: 'encode' },
                    { name: 'decode', value: 'decode' }
                ))
        .addStringOption(option =>
            option.setName('input')
                .setDescription('The message to encode/decode')
                .setRequired(true))
].map(cmd => cmd.toJSON());


client.once('ready', async () => {
    console.log(`Bot is online as ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(token);
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('Slash commands registered.');
    } catch (err) {
        console.error('Error registering commands:', err);
    }
});

client.on('interactionCreate', async interaction => {
    try{
    
    if (!interaction.isChatInputCommand()) return;

    const parseNums = input => input.split(/[^0-9.\-]+/).map(Number).filter(n => !isNaN(n));
	if (interaction.commandName === 'cryptanalysis') {
        const input = interaction.options.getString('input');
        const freq = {};
        for (const char of input.replace(/\s/g, '').toLowerCase()) {
            freq[char] = (freq[char] || 0) + 1;
        }
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        const result = sorted.map(([char, count]) => `${char}: ${count}`).join('\n');
        return interaction.reply({ content: `Character Frequency:\n\`\`\`\n${result}\n\`\`\`` });
    }

    if (interaction.commandName === 'atbash') {
        const input = interaction.options.getString('input');
        const result = atbash(input);
        return interaction.reply({ content: `Result: ${result}` });
    }

    if (interaction.commandName === 'caesar') {
        const operation = interaction.options.getString('operation');
        const input = interaction.options.getString('input');
        const shift = interaction.options.getInteger('shift');

        const caesar = (text, shiftVal) => {
            return text.split('').map(char => {
                if (/[a-z]/.test(char)) {
                    return String.fromCharCode((char.charCodeAt(0) - 97 + shiftVal + 26) % 26 + 97);
                } else if (/[A-Z]/.test(char)) {
                    return String.fromCharCode((char.charCodeAt(0) - 65 + shiftVal + 26) % 26 + 65);
                } else {
                    return char;
                }
            }).join('');
        };

        if (operation === 'encode') {
            if (shift === null) {
                const allCombos = Array.from({ length: 26 }, (_, i) => `+${i}: \`${caesar(input, i)}\``).join('\n');
                return interaction.reply({ content: `**All Caesar Shift Encodings:**\n${allCombos}` });
            }
            const encoded = caesar(input, shift);
            if (!shift === null) {
            	return interaction.reply(`Shift +${shift}: \`${encoded}\``);
            }
        } else { // decode
            if (shift === null) {
                const allCombos = Array.from({ length: 26 }, (_, i) => `+${i}: \`${caesar(input, -i)}\``).join('\n');
                return interaction.reply({ content: `**All Caesar Shift Decodings:**\n${allCombos}` });
            } else {
                const decoded = caesar(input, -shift);
                return interaction.reply(`Shift +${shift}: \`${decoded}\``);
            }
        }
    }

    if (interaction.commandName === 'baconian-24' || interaction.commandName === 'baconian-26') {
        const input = interaction.options.getString('input');
        const operation = interaction.options.getString('operation');
        const version = interaction.commandName === 'baconian-24' ? 24 : 26;
        const encode = operation === 'encode';
        const result = baconian(input, version, encode);
        if (version !== 24 || encode || (!result.includes('I') && !result.includes('J')))  {
    		return interaction.reply({ content: `Result: ${result}` });
		} else {
    		return interaction.reply({ content: `Result: ${result}\n\nNote: I = I/J, U = U/V because both pairs of characters encode to the same value.` });
		}

    }

    if (interaction.commandName === 'binary') {
        const input = interaction.options.getString('input');
        const operation = interaction.options.getString('operation');
        const encode = operation === 'encode';
        const result = binaryCipher(input, encode);
        return interaction.reply({ content: `Result: ${result}` });
    }
    if (interaction.commandName === 'regression') {
        const type = interaction.options.getString('type');
        const xVals = parseNums(interaction.options.getString('x_values'));
        const yVals = parseNums(interaction.options.getString('y_values'));

        if (xVals.length !== yVals.length || xVals.length < 2) {
            return interaction.reply({ content: 'X and Y must be equal in length and at least 2 pairs.', ephemeral: true });
        }

        const n = xVals.length;
        const data = xVals.map((x, i) => [x, yVals[i]]);

        let coeffs = [];
        let formula = '';
        let generalFormula = '';
        let yhat = [];

        if (type === 'linear') {
            const x̄ = xVals.reduce((a, b) => a + b) / n;
            const ȳ = yVals.reduce((a, b) => a + b) / n;
            const Sxy = xVals.reduce((sum, x, i) => sum + (x - x̄) * (yVals[i] - ȳ), 0);
            const Sxx = xVals.reduce((sum, x) => sum + (x - x̄) ** 2, 0);
            const b = Sxy / Sxx;
            const a = ȳ - b * x̄;
            coeffs = [a, b];
            generalFormula = 'y = a + bx';
            yhat = xVals.map(x => a + b * x);
        } else {
            const X = [];
            for (let i = 0; i < n; i++) {
                let row = [];
                switch (type) {
                    case 'quadratic':
                        row = [1, xVals[i], xVals[i] ** 2];
                        generalFormula = 'y = ax² + bx + c';
                        break;
                    case 'cubic':
                        row = [1, xVals[i], xVals[i] ** 2, xVals[i] ** 3];
                        generalFormula = 'y = ax³ + bx² + cx + d';
                        break;
                    case 'quartic':
                        row = [1, xVals[i], xVals[i] ** 2, xVals[i] ** 3, xVals[i] ** 4];
                        generalFormula = 'y = ax⁴ + bx³ + cx² + dx + e';
                        break;
                    case 'exp10':
                        row = [1, xVals[i]];
                        generalFormula = 'y = a * 10^(bx)';
                        break;
                    case 'log10':
                        row = [1, Math.log10(xVals[i])];
                        generalFormula = 'y = a + b * log₁₀(x)';
                        break;
                    case 'expe':
                        row = [1, xVals[i]];
                        generalFormula = 'y = a * e^(bx)';
                        break;
                    case 'loge':
                        row = [1, Math.log(xVals[i])];
                        generalFormula = 'y = a + b * ln(x)';
                        break;
                    default:
                        return interaction.reply({ content: 'Invalid regression type.', ephemeral: true });
                }
                X.push(row);
            }
            const XT = math.transpose(X);
            const XTX = math.multiply(XT, X);
            const XTy = math.multiply(XT, yVals);
            coeffs = math.multiply(math.inv(XTX), XTy);

            switch (type) {
                case 'exp10':
                    const A10 = Math.pow(10, coeffs[0]);
                    const B10 = coeffs[1];
                    yhat = xVals.map(x => A10 * Math.pow(10, B10 * x));
                    break;
                case 'log10':
                    yhat = xVals.map(x => coeffs[0] + coeffs[1] * Math.log10(x));
                    break;
                case 'expe':
                    const Ae = Math.exp(coeffs[0]);
                    const Be = coeffs[1];
                    yhat = xVals.map(x => Ae * Math.exp(Be * x));
                    break;
                case 'loge':
                    yhat = xVals.map(x => coeffs[0] + coeffs[1] * Math.log(x));
                    break;
                default:
                    yhat = xVals.map(x => coeffs.reduce((sum, c, i) => sum + c * x ** i, 0));
            }
        }

        const ȳ = yVals.reduce((a, b) => a + b) / n;
        const SSres = yVals.reduce((sum, y, i) => sum + (y - yhat[i]) ** 2, 0);
        const SStot = yVals.reduce((sum, y) => sum + (y - ȳ) ** 2, 0);
        const r2 = 1 - SSres / SStot;
        const r = Math.sqrt(r2);

        const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');

        const embed = new EmbedBuilder()
            .setTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} Regression`)
            .setColor(0x020080)
            .addFields(
                { name: 'Data', value: `[${data.map(([x, y]) => `(${x}, ${y})`).join(', ')}]` },
                { name: 'General Equation', value: generalFormula },
                { name: 'Coefficients', value: coeffs.map((c, i) => `${letters[i]} = ${c.toFixed(3)}`).join(', ') },
                { name: 'Correlation', value: `r = ${r.toFixed(3)}, r² = ${r2.toFixed(3)}` }
            );

        return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'analyze') {
    const type = interaction.options.getString('type');
    const data = parseNums(interaction.options.getString('data')).sort((a, b) => a - b);

    if (data.length < 2) {
        return interaction.reply({ content: 'Please provide at least two numbers.', ephemeral: true });
    }

    const n = data.length;
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const median = getMedian(data);
    const mode = getMode(data);
    const min = data[0];
    const max = data[n - 1];
    const q1 = getMedian(data.slice(0, Math.floor(n / 2)));
    const q3 = getMedian(data.slice(Math.ceil(n / 2)));
    const iqr = q3 - q1;
    const outliers = getOutliers(data, q1, q3);

    // Choose formula based on 'type'
    const variance = type === 'parameter'
        ? data.reduce((a, b) => a + (b - mean) ** 2, 0) / n
        : data.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);

    const stdDev = Math.sqrt(variance);
    const skewness = getSkewness(data, mean, stdDev);

    const embed = new EmbedBuilder()
        .setTitle(`Statistical Analysis for a ${capitalize(type)}`)
        .setColor(0x008080)
        .addFields(
            { name: 'Sorted Data', value: `[${data.join(', ')}]` },
            {
                name: 'General Data',
                value: `∑x = ${sum.toFixed(3)}, mode = ${mode.length ? mode.join(', ') : 'None'}, γ = ${skewness.toFixed(3)}`
            },
            {
                name: 'Mean',
                value: type === 'parameter'
                    ? `μ = ${mean.toFixed(3)}, σ = ${stdDev.toFixed(3)}, σ² = ${variance.toFixed(3)}`
                    : `x̄ = ${mean.toFixed(3)}, s = ${stdDev.toFixed(3)}, s² = ${variance.toFixed(3)}`
            },
            {
                name: 'Median',
                value: `5n = [${min}, ${q1.toFixed(3)}, ${median.toFixed(3)}, ${q3.toFixed(3)}, ${max}], IQR = ${iqr.toFixed(3)}, Outliers = [${outliers.length ? outliers.join(', ') : 'None'}]`
            }
        );

    return interaction.reply({ embeds: [embed] });
}
    } catch (err) {
        console.error('Unhandled command error:', err);
        if (interaction.replied || interaction.deferred) {
            interaction.followUp({ content: 'An error occurred while processing your command.', ephemeral: true });
        } else {
            interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
        }
    }

});

function parseNums(input) {
    return input.match(/-?\d+(\.\d+)?/g).map(Number);
}

function getMedian(arr) {
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 === 0
        ? (arr[mid - 1] + arr[mid]) / 2
        : arr[mid];
}

function getMode(arr) {
    const freq = {};
    arr.forEach(num => freq[num] = (freq[num] || 0) + 1);
    const maxFreq = Math.max(...Object.values(freq));
    const modes = Object.entries(freq).filter(([_, v]) => v === maxFreq).map(([k]) => Number(k));
    return modes.length === arr.length ? [] : modes;
}

function getOutliers(data, q1, q3) {
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    return data.filter(x => x < lowerBound || x > upperBound);
}

function getSkewness(data, mean, stdDev) {
    const n = data.length;
    const sumCubed = data.reduce((acc, val) => acc + ((val - mean) ** 3), 0);
    return (n / ((n - 1) * (n - 2))) * (sumCubed / (stdDev ** 3));
}

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}
// Cipher Functions
function caesar(str, shift, operation) {
    if (operation === 'decode') shift = -shift;
    return str.replace(/[a-zA-Z]/g, c => {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode((c.charCodeAt(0) - base + shift + 26) % 26 + base);
    });
}

function atbash(str) {
    return str.replace(/[a-zA-Z]/g, c => {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode(25 - (c.charCodeAt(0) - base) + base);
    });
}

function baconian(str, version, encode = true) {
    const map = {};
    let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (version === 24) alphabet = alphabet.replace(/[J]/, '').replace(/[U]/, '');
    
    for (let i = 0; i < alphabet.length; i++) {
        let letter = alphabet[i];
        map[letter] = i.toString(2).padStart(5, '0').replace(/0/g, 'a').replace(/1/g, 'b');
    }

    if (encode) {
        return str.toUpperCase().replace(/[A-Z𝕛]/g, c => {
            if (version === 24 && (c === 'J' || c === '𝕛' || c === 'U')) c = c === 'U' ? 'V' : 'I';
            return map[c] || c;
        });
    } else {
        // Normalize 0/1 to a/b
        const normalized = str.toLowerCase().replace(/0/g, 'a').replace(/1/g, 'b');
        const reversedMap = Object.entries(map).reduce((acc, [k, v]) => (acc[v] = k, acc), {});
        return normalized.match(/[ab]{5}/g)?.map(b => reversedMap[b] || '?').join('') || '';
    }
}





function binaryCipher(str, encode = true) {
    if (encode) {
        return str.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
    } else {
        return str.split(' ').map(b => String.fromCharCode(parseInt(b, 2))).join('');
    }
}



client.login(token);
