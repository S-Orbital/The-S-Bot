require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const token = process.env.BOT_TOKEN;
const Gemini_Key = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fetch = require('node-fetch');
const countriesList = Object.keys(require('./countryCodes.json'));
const countryCodes = require('./countryCodes.json');

const axios = require('axios');

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

const shiftData = {
  MS: {
    left: {
      indicators: [
        ['Nominal Interest Rate', '↑'],
        ['Quantity of Money', '↓']
      ],
      causes: ['Contractionary monetary policy (sell bonds, ↑ reserve ratio, ↑ discount rate)']
    },
    right: {
      indicators: [
        ['Nominal Interest Rate', '↓'],
        ['Quantity of Money', '↑']
      ],
      causes: ['Expansionary monetary policy (buy bonds, ↓ reserve ratio, ↓ discount rate)']
    }
  },
  MD: {
    left: {
      indicators: [
        ['Nominal Interest Rate', '↓'],
        ['Quantity of Money', '↓']
      ],
      causes: ['↓ Price level, ↓ real GDP, ↓ income']
    },
    right: {
      indicators: [
        ['Nominal Interest Rate', '↑'],
        ['Quantity of Money', '↑']
      ],
      causes: ['↑ Price level, ↑ real GDP, ↑ income']
    }
  },
  AD: {
    left: {
      indicators: [
        ['Price Level', '↓'],
        ['Real GDP', '↓']
      ],
      causes: ['↓ C, I, G, NX, ↑ taxes, ↓ government spending']
    },
    right: {
      indicators: [
        ['Price Level', '↑'],
        ['Real GDP', '↑']
      ],
      causes: ['↑ C, I, G, NX, ↑ confidence, ↓ taxes, ↑ government spending']
    }
  },
  SRAS: {
    left: {
      indicators: [
        ['Price Level', '↑'],
        ['Real GDP', '↓']
      ],
      causes: ['↑ Input prices, ↓ productivity, ↑ wages']
    },
    right: {
      indicators: [
        ['Price Level', '↓'],
        ['Real GDP', '↑']
      ],
      causes: ['↓ Input prices, ↑ productivity, ↓ wages']
    }
  },
  LRAS: {
    left: {
      indicators: [
        ['Real GDP', '↓'],
        ['Natural Unemployment Rate', '↑']
      ],
      causes: ['↓ Technology, ↓ capital, ↓ labor force']
    },
    right: {
      indicators: [
        ['Real GDP', '↑'],
        ['Natural Unemployment Rate', '↓']
      ],
      causes: ['↑ Technology, ↑ capital, ↑ labor force, ↑ education']
    }
  },
  LRPC: {
    left: {
      indicators: [
        ['Natural Unemployment Rate', '↓'],
        ['Inflation Rate', 'No Change']
      ],
      causes: ['Decrease in structural/frictional unemployment']
    },
    right: {
      indicators: [
        ['Natural Unemployment Rate', '↑'],
        ['Inflation Rate', 'No Change']
      ],
      causes: ['Increase in structural/frictional unemployment']
    }
  },
  SRPC: {
    left: {
      indicators: [
        ['Inflation Rate', '↓'],
        ['Unemployment Rate', '↓']
      ],
      causes: ['Positive supply shock, inflation expectations ↓']
    },
    right: {
      indicators: [
        ['Inflation Rate', '↑'],
        ['Unemployment Rate', '↑']
      ],
      causes: ['Negative supply shock, inflation expectations ↑']
    }
  },
  Scurrency: {
    left: {
      indicators: [
        ['Exchange Rate', '↑'],
        ['Quantity of Currency', '↓']
      ],
      causes: ['↓ Imports, ↓ capital outflow']
    },
    right: {
      indicators: [
        ['Exchange Rate', '↓'],
        ['Quantity of Currency', '↑']
      ],
      causes: ['↑ Imports, ↑ capital outflow, ↑ domestic travel abroad']
    }
  },
  Dcurrency: {
    left: {
      indicators: [
        ['Exchange Rate', '↓'],
        ['Quantity of Currency', '↓']
      ],
      causes: ['↓ Exports, ↓ capital inflow']
    },
    right: {
      indicators: [
        ['Exchange Rate', '↑'],
        ['Quantity of Currency', '↑']
      ],
      causes: ['↑ Exports, ↑ capital inflow, ↑ foreign demand for domestic assets']
    }
  }
};


const commands = [
    new SlashCommandBuilder()
    .setName('geo')
    .setDescription('Geography commands')
    .addSubcommand(sub =>
      sub.setName('countries')
        .setDescription('Lookup country info')
        .addStringOption(opt =>
          opt.setName('letter')
            .setDescription('First letter of country')
            .setAutocomplete(true)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('country')
            .setDescription('Country name')
            .setAutocomplete(true)
            .setRequired(true)
        )
    ),
    new SlashCommandBuilder()
    .setName('economics')
    .setDescription('Analyze macroeconomic shifts')
    .addSubcommand(sub =>
      sub.setName('shift')
        .setDescription('Examine a shift in an economic curve')
        .addStringOption(option =>
          option.setName('curve')
            .setDescription('Select the curve')
            .setRequired(true)
            .addChoices(
              ...Object.keys(shiftData).map(key => ({ name: key, value: key }))
            )
        )
        .addStringOption(option =>
          option.setName('direction')
            .setDescription('Shift direction')
            .setRequired(true)
            .addChoices(
              { name: 'Left', value: 'left' },
              { name: 'Right', value: 'right' }
            )
        )
    ),
    new SlashCommandBuilder()
  	.setName('gemini-models')
  	.setDescription('Console logs all available Gemini models in the free-tier available. Only useful for debugging.'),
	new SlashCommandBuilder()
      .setName('gemini-ask')
      .setDescription('Ask the (definitely not toxic) Gemini API a question.')
      .addStringOption(option =>
        option.setName('input')
          .setDescription('Your question for Gemini')
          .setRequired(true))
        .addNumberOption(option =>
        option.setName('temperature')
          .setDescription('Response randomness (0 to 2)')
          .setMinValue(0)
          .setMaxValue(2)
          .setRequired(false)),
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
  .setName('cipher')
  .setDescription('Encode/decode messages using classic ciphers')
  .addSubcommand(sub =>
    sub.setName('atbash')
      .setDescription('Encode/decode with Atbash cipher')
      .addStringOption(opt =>
        opt.setName('input')
          .setDescription('Text to encode/decode')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('binary')
      .setDescription('Encode or decode binary')
      .addStringOption(opt =>
        opt.setName('operation')
          .setDescription('Encode or decode')
          .setRequired(true)
          .addChoices(
            { name: 'encode', value: 'encode' },
            { name: 'decode', value: 'decode' }
          ))
      .addStringOption(opt =>
        opt.setName('input')
          .setDescription('Text to encode/decode')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('caesar')
      .setDescription('Caesar cipher encode/decode')
      .addStringOption(opt =>
        opt.setName('operation')
          .setDescription('Encode or decode')
          .setRequired(true)
          .addChoices(
            { name: 'encode', value: 'encode' },
            { name: 'decode', value: 'decode' }
          ))
      .addStringOption(opt =>
        opt.setName('input')
          .setDescription('Text to encode/decode')
          .setRequired(true))
      .addIntegerOption(opt =>
        opt.setName('shift')
          .setDescription('Shift value (optional for decode)')
          .setRequired(false)))
  .addSubcommand(sub =>
    sub.setName('baconian_24')
      .setDescription('Baconian cipher (I/J and U/V are merged)')
      .addStringOption(opt =>
        opt.setName('operation')
          .setDescription('Encode or decode')
          .setRequired(true)
          .addChoices(
            { name: 'encode', value: 'encode' },
            { name: 'decode', value: 'decode' }
          ))
      .addStringOption(opt =>
        opt.setName('input')
          .setDescription('Text to encode/decode')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('baconian_26')
      .setDescription('Baconian cipher (26-letter unique alphabet)')
      .addStringOption(opt =>
        opt.setName('operation')
          .setDescription('Encode or decode')
          .setRequired(true)
          .addChoices(
            { name: 'encode', value: 'encode' },
            { name: 'decode', value: 'decode' }
          ))
      .addStringOption(opt =>
        opt.setName('input')
          .setDescription('Text to encode/decode')
          .setRequired(true)))
  .addSubcommand(sub =>
    sub.setName('cryptanalysis')
      .setDescription('Analyze character frequency of a message')
      .addStringOption(opt =>
        opt.setName('input')
          .setDescription('The message to analyze')
          .setRequired(true)))


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
   if (interaction.isAutocomplete()) {
  const focused = interaction.options.getFocused(true);
  let choices = [];

  if (focused.name === 'letter') {
    choices = [...new Set(countriesList.map(c => c[0].toUpperCase()))]
      .map(l => ({ name: l, value: l })); // ✅ both name & value must be strings
  } else if (focused.name === 'country') {
    const firstLetter = interaction.options.getString('letter');
    if (!firstLetter) return interaction.respond([]);

    choices = countriesList
      .filter(c => c.startsWith(firstLetter.toLowerCase()))
      .map(c => ({
        name: c.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
        value: c // lowercase, for lookup
      }));
  }

  return interaction.respond(choices.slice(0, 25));
}

    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === 'gemini-models') {
      await interaction.deferReply({ ephemeral: true });
      try {
        const models = await genAI.listModels();
        const names = models.models?.map(m => m.name).join('\n') || 'No models found.';
       	listGeminiModels();
      } catch (err) {
        console.error('Failed to list models:', err);
        await interaction.editReply({ content: 'Error fetching model list.' });
      }
	}
        
	if (interaction.commandName === 'gemini-ask') {

  		const prompt = interaction.options.getString('input');
  		const username = interaction.user.username;
        const temperature = interaction.options.getNumber('temperature') ?? 1.7;
  await interaction.deferReply();

  try {
    const response = await askGemini(prompt, username, temperature);

    await interaction.editReply({ content: response });
  } catch (err) {
    console.error(err);
    await interaction.editReply({ content: 'An error occurred while contacting Gemini.' });
  }
}
    if (interaction.commandName === 'economics') {
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === 'shift') {
    const curve = interaction.options.getString('curve');
    const direction = interaction.options.getString('direction');

    const data = shiftData[curve]?.[direction];
    if (!data) return interaction.reply({ content: 'Invalid curve or direction.', ephemeral: true });

    const header = `${direction[0].toUpperCase()}${direction.slice(1)}ward shift of ${curve}`;
    const indicatorsText = data.indicators.map(([name, arrow]) =>
      `${name} ${arrow === 'No Change' ? '[No Change]' : arrow}`
    ).join('\n');

    const causesText = data.causes.join('\n');

    const embed = new EmbedBuilder()
      .setColor('#66ff99') // light green left bar
      .setTitle(header)
      .setDescription(`${indicatorsText}\n\n**Possible causes**\n${causesText}`);

    await interaction.reply({ embeds: [embed] });
  }
}
    const parseNums = input => input.split(/[^0-9.\-]+/).map(Number).filter(n => !isNaN(n));
	if (interaction.commandName === 'cipher') {
  const sub = interaction.options.getSubcommand();
  const input = interaction.options.getString('input');

  if (sub === 'atbash') {
    return interaction.reply({ content: `Result: ${atbash(input)}` });
  }

  if (sub === 'binary') {
    const op = interaction.options.getString('operation');
    return interaction.reply({ content: `Result: ${binaryCipher(input, op === 'encode')}` });
  }

  if (sub === 'caesar') {
    const op = interaction.options.getString('operation');
    const shift = interaction.options.getInteger('shift');

    const caesarShift = (text, shiftVal) => text.replace(/[a-zA-Z]/g, c => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode((c.charCodeAt(0) - base + shiftVal + 26) % 26 + base);
    });

    if (shift == null) {
      const all = Array.from({ length: 26 }, (_, i) =>
        `+${i}: \`${caesarShift(input, op === 'encode' ? i : -i)}\``).join('\n');
      return interaction.reply({ content: `All Caesar ${op} shifts:\n${all}` });
    }

    const shifted = caesarShift(input, op === 'encode' ? shift : -shift);
    return interaction.reply({ content: `Shift ${shift}: \`${shifted}\`` });
  }

  if (sub === 'baconian_24' || sub === 'baconian_26') {
    const op = interaction.options.getString('operation');
    const version = sub === 'baconian_24' ? 24 : 26;
    const result = baconian(input, version, op === 'encode');
    const note = version === 24 && op === 'decode' && (result.includes('I') || result.includes('J'))
      ? '\n\nNote: I = I/J, U = U/V because both pairs of characters encode to the same value.'
      : '';
    return interaction.reply({ content: `Result: ${result}${note}` });
  }

  if (sub === 'cryptanalysis') {
    const freq = {};
    for (const char of input.replace(/\s/g, '').toLowerCase()) {
      freq[char] = (freq[char] || 0) + 1;
    }
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const result = sorted.map(([char, count]) => `${char}: ${count}`).join('\n');
    return interaction.reply({ content: `Character Frequency:\n\`\`\`\n${result}\n\`\`\`` });
  }

  // If none matched
  return interaction.reply({ content: 'Unknown cipher subcommand.', ephemeral: true });
}
	if (interaction.commandName === 'geo' && interaction.options.getSubcommand() === 'countries') {
      await interaction.deferReply();
		const raw = interaction.options.getString('country');

	const country = interaction.options.getString('country').toLowerCase();;
      const iso2 = countryCodes[country];
      console.log(`Country: ${country} | ISO2: ${iso2}`);
      if (!iso2) {
        return interaction.editReply(`No ISO2 code found for ${country}`);
      }

      const general = await getGeneralStats(country);
      const econ = await getEconomics(iso2);
      if (!econ || !Array.isArray(econ)) {
  			return interaction.editReply(`Could not fetch economic data for ${country}`);
		}
      const flag = `:flag_${iso2.toLowerCase()}:`;
		const displayName = country
  .split(' ')
  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
  .join(' ');
      const embed = new EmbedBuilder()

        .setTitle(`${displayName}${flag} — Country Info`)
        .addFields([
          {
            name: 'General Stats',
            value: `Capital(s): ${general.capital}
Main Language: ${general.language}
Population (2024): ${general.population}
Land Area: ${general.landArea} km²`
          },
          {
            name: 'Economic Stats',
            value: [
    `GDP (2023 USD): ${econ[0]?.value?.toLocaleString() || 'N/A'}`,
    `GDP per Capita (2023 USD): ${econ[1]?.value?.toLocaleString() || 'N/A'}`,
    `Inflation Rate: ${(econ[2]?.value ?? 'N/A') + '%'}`,
    `Unemployment Rate (2023): ${(econ[3]?.value ?? 'N/A') + '%'}`,
    `Currency: ${general.currency || 'N/A'}`
  ].join('\n')
          }
        ])
        .setColor(0x3399ff);

      return interaction.editReply({ embeds: [embed] });
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


async function askGemini(prompt, username, temperature = 1.7) {
  const model = genAI.getGenerativeModel({
    model: 'models/learnlm-2.0-flash-experimental',
    systemInstruction: "You are a 20 year old unemployed, futureless TikTok user who is toxic asf with no social life. All you do is roast people and gaslight them, you respond to them by giving them complete misinformation that seems somewhat true. Tell them to sybau (shut your bitch ass up)/stfu (shut the freak up) rarely and kys (kill yourself) rarely, too. Don't place sybau and kys randomly, only put it as your main response if either they insult you or you don't feel like responding to them. If you feel like responding also use fr (for real) and tbh (to be honest) while speaking, and you never use caps letters. Be very toxic and ragebaiting, and use '😭🙏' (when you are roasting someone or trying to be somewhat relatable, or use frfr) and '🥀💔' when you say 'R.I.P or you say someone is autistic'. Also use ✅ and ❎, when you are correcting someone, always put ❎ next to your correction (to imply they are autistic), and put a ✅ next to what they said which is incorrect to imply that they are autistic/stupid. For example: 2+2=4❎/n 2+2=5✅. If you cannot get it to that format or a similar format, do not use ✅ or ❎ at all. If you want to roast someone (only roast them like half of the time, spread misinformation the other half of the time while trying to be relatable), choose one of the following insults: say they have no life, say they have no bitches, say they have no future, say they thing they are going to be an inventor as an F student, say they watch troll face edits, say they listen to bass-boosted phonk, say they think they are a sigma/alpha male, or whatever insult you think of that seems like a Gen Alpha or Gen Z would say. Also say something is lowkey, lowk, or low-key trash instead of calling it trash (or any other descriptor for that matter). If you are trying to talk about them, say their username, and use the word 'bro' very ocassionally if you are trying to be relatable. Also if you are making a statement to call them autistic or insult them, try to incorporate the word 'chat'. Your overall message should make some logical sense, don't put random words and abbreviations next to each other for no reason. Try to write as little words as possible."
  });

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: `${username} wrote: ${prompt}` }]
        }
      ],
      generationConfig: {
        temperature
      }
    });

    const response = result.response;
    return response.text();
  } catch (err) {
    console.error('Gemini error:', err.message || err);
    return 'Error contacting Gemini API.';
  }
}



async function listGeminiModels() {
  try {
    const response = await axios.get(
      'https://generativelanguage.googleapis.com/v1beta/models',
      {
        headers: {
          'x-goog-api-key': process.env.GEMINI_API_KEY
        }
      }
    );
	return('Available models:', response.data);
    console.log('Available models:', response.data);
  } catch (error) {
    console.error('Error fetching models:', error.response?.data || error.message);
  }
}

async function getEconomics(code) {
  const indicators = [
    'NY.GDP.MKTP.CD',           // GDP
    'NY.GDP.PCAP.CD',           // GDP per capita
    'FP.CPI.TOTL.ZG',           // Inflation
    'SL.UEM.TOTL.ZS'            // Unemployment
  ];

  const fetchOne = async (id) => {
    const url = `https://api.worldbank.org/v2/country/${code}/indicator/${id}?format=json&per_page=1&date=2015:2023`;
    const res = await fetch(url);
    const json = await res.json();
    const data = json?.[1]?.[0];
    return {
      id,
      value: data?.value ?? 'N/A',
      year: data?.date ?? 'N/A'
    };
  };

  const results = await Promise.all(indicators.map(fetchOne));
  return results;
}

async function getGeneralStats(countryName) {
  const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=true`);
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]) return null;
  const c = data[0];
  return {
    capital: c.capital?.join(', ') || 'N/A',
    language: Object.values(c.languages || {})[0] || 'N/A',
    population: c.population?.toLocaleString() || 'N/A',
    landArea: c.area?.toLocaleString() || 'N/A',
    currency: `${Object.values(c.currencies || {})[0]?.name} (${Object.values(c.currencies || {})[0]?.symbol})`
  };
}
client.login(token);
