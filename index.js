require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { SHARD_VALUE_TABLE } = require('./shard-data.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// --- DATA PARSING ---
const allKeys = Object.keys(SHARD_VALUE_TABLE);
const uniqueStars = [...new Set(allKeys.map(key => key.charAt(0)))].sort((a, b) => a - b);
const uniqueGrades = [...new Set(allKeys.map(key => key.charAt(key.length - 1)))].sort((a, b) => a - b);

// --- HELPER FUNCTIONS ---
const getStarLabel = (star) => {
  const num = parseInt(star, 10);
  const yellowStars = '⭐'.repeat(num);
  const blackStars = '⬛'.repeat(6 - num);
  return `${yellowStars} ${star} Star`;
};

const getGradeLabel = (grade) => {
  const num = parseInt(grade, 10);
  if (num === 0) return 'Grade 0';
  const triangles = '▲'.repeat(num);
  return `${triangles} Grade ${grade}`;
};

const getVisualRepresentation = (star, grade, wasLocked, wasUnlocked) => {
    if (star === '0' && grade === '0') {
        if (wasLocked) return '🔒';
        // Check for wasUnlocked or just default to unlocked emoji
        return '🔓';
    }
    const starNum = parseInt(star, 10);
    const gradeNum = parseInt(grade, 10);
    const stars = '⭐'.repeat(starNum);
    const triangles = '▲'.repeat(gradeNum);
    return `${stars}${triangles}`;
};


// --- COMPONENT BUILDER HELPER ---
const buildComponents = (state = {}) => {
  const { currentStar, currentGrade, desiredStar, desiredGrade, wasCurrentBenderLocked, wasDesiredBenderLocked } = state;
  const step = !currentStar ? 0 : (!currentGrade ? 1 : (!desiredStar ? 2 : (!desiredGrade ? 3 : 4)));

  // --- Define Placeholders ---
  const currentStarPlaceholder = currentStar ? getStarLabel(currentStar) : 'Current Stars';
  const currentGradePlaceholder = wasCurrentBenderLocked ? 'Need to unlock Bender 🔒' : (currentStar === '6' ? 'Bender Maxed 💪🔥' : (currentGrade ? getGradeLabel(currentGrade) : 'Current Grade'));
  const desiredStarPlaceholder = desiredStar ? getStarLabel(desiredStar) : 'Desired Stars';
  const desiredGradePlaceholder = wasDesiredBenderLocked ? 'Need to unlock Bender 🔒' : (desiredStar === '6' ? 'Bender Maxed 💪🔥' : (desiredGrade ? getGradeLabel(desiredGrade) : 'Desired Grade'));

  // --- Define customIds that carry state forward via a 1/0 boolean flag ---
  const currentGradeId = currentStar ? `currentGrade_${currentStar}` : 'currentGrade';
  const desiredStarId = (currentStar && currentGrade) ? `desiredStar_${currentStar}_${currentGrade}_${wasCurrentBenderLocked ? 1 : 0}` : 'desiredStar';
  const desiredGradeId = (currentStar && currentGrade && desiredStar) ? `desiredGrade_${currentStar}_${currentGrade}_${desiredStar}_${wasCurrentBenderLocked ? 1 : 0}` : 'desiredGrade';
  const calculateId = (currentStar && currentGrade && desiredStar && desiredGrade) ? `calculate_${currentStar}_${currentGrade}_${desiredStar}_${desiredGrade}_${wasCurrentBenderLocked ? 1 : 0}_${wasDesiredBenderLocked ? 1 : 0}` : 'calculate';

  // --- OPTIONS GENERATORS ---
  const getGradeOptions = (forStar, isDesired, currentStarForFilter, currentGradeForFilter) => {
    let gradesSource = uniqueGrades;
    // If we are building the desired grade dropdown AND the desired star is the same as the current star...
    if (isDesired && forStar === currentStarForFilter) {
      // ...only show grades higher than the current grade.
      gradesSource = uniqueGrades.filter(g => parseInt(g, 10) > parseInt(currentGradeForFilter, 10));
    }

    if (forStar === '0') {
      const options = [];
      // Only add "Need to unlock" if it's the current dropdown and grade 0 is a valid option
      if (!isDesired && gradesSource.includes('0')) {
        options.push({ label: 'Need to unlock Bender 🔒', value: '0_locked' });
      }
      // Only add "Already unlocked" if grade 0 is a valid option
      if (gradesSource.includes('0')) {
        options.push({ label: 'Grade 0 - Bender Already Unlocked ✅', value: '0_unlocked' });
      }
      options.push(...gradesSource.filter(g => g !== '0').map(g => ({ label: getGradeLabel(g), value: g })));
      return options;
    }
    return gradesSource.map(g => ({ label: getGradeLabel(g), value: g }));
  };
  
  // --- COMPONENT DEFINITIONS ---
  const starsForCurrentMenu = uniqueStars.filter(s => s !== '6');
  const currentStarMenu = new StringSelectMenuBuilder().setCustomId('currentStar').setPlaceholder(currentStarPlaceholder).setDisabled(false).addOptions(starsForCurrentMenu.map(s => ({ label: getStarLabel(s), value: s })));
  const currentGradeMenu = new StringSelectMenuBuilder().setCustomId(currentGradeId).setPlaceholder(currentGradePlaceholder).setDisabled(!currentStar).addOptions(currentStar ? getGradeOptions(currentStar, false) : [{ label: '...', value: 'dummy' }]);

  // Filter the stars for the desired dropdown
  const filteredStars = (step >= 2)
    ? uniqueStars.filter(s => parseInt(s, 10) >= parseInt(currentStar, 10))
    : uniqueStars;

  const desiredStarMenu = new StringSelectMenuBuilder().setCustomId(desiredStarId).setPlaceholder(desiredStarPlaceholder).setDisabled(!currentGrade).addOptions(filteredStars.map(s => ({ label: getStarLabel(s), value: s })));
  const desiredGradeMenu = new StringSelectMenuBuilder().setCustomId(desiredGradeId).setPlaceholder(desiredGradePlaceholder).setDisabled(!desiredStar).addOptions(desiredStar ? getGradeOptions(desiredStar, true, currentStar, currentGrade) : [{ label: '...', value: 'dummy' }]);
  const calculateButton = new ButtonBuilder().setCustomId(calculateId).setLabel('Calculate').setEmoji('🧮').setStyle(step === 4 ? ButtonStyle.Success : ButtonStyle.Primary).setDisabled(step !== 4);

  return [
    new ActionRowBuilder().addComponents(currentStarMenu),
    new ActionRowBuilder().addComponents(currentGradeMenu),
    new ActionRowBuilder().addComponents(desiredStarMenu),
    new ActionRowBuilder().addComponents(desiredGradeMenu),
    new ActionRowBuilder().addComponents(calculateButton),
  ];
};

client.on('interactionCreate', async interaction => {
  // --- COMMAND HANDLER ---
  if (interaction.isCommand()) {
      if (interaction.commandName === 'calculateshards') {
          await interaction.reply({ content: 'Please select your current and desired star/grade values.', components: buildComponents() });
      }
  }

  // --- COMPONENT INTERACTION HANDLER ---
  if (interaction.isStringSelectMenu() || interaction.isButton()) {
    const [action, ...params] = interaction.customId.split('_');

    if (interaction.isStringSelectMenu()) {
      const selectedValue = interaction.values[0];
      let state = {};
      let content = 'Please select your current and desired star/grade values.';

      switch (action) {
        case 'currentStar':
          state = { currentStar: selectedValue };
          if (selectedValue === '6') { state.currentGrade = '0'; }
          break;
        case 'currentGrade':
          state = { currentStar: params[0], currentGrade: selectedValue.startsWith('0_') ? '0' : selectedValue, wasCurrentBenderLocked: selectedValue === '0_locked' };
          break;
        case 'desiredStar':
          state = { currentStar: params[0], currentGrade: params[1], desiredStar: selectedValue, wasCurrentBenderLocked: params[2] === '1' };
          if (selectedValue === '6') { state.desiredGrade = '0'; }
          break;
        case 'desiredGrade':
          state = { currentStar: params[0], currentGrade: params[1], desiredStar: params[2], desiredGrade: selectedValue.startsWith('0_') ? '0' : selectedValue, wasCurrentBenderLocked: params[3] === '1', wasDesiredBenderLocked: selectedValue === '0_locked' };
          content = 'All values selected. Ready to calculate!';
          break;
      }
      await interaction.update({ content, components: buildComponents(state) });
    }

    if (interaction.isButton() && action === 'calculate') {
      const [currentStar, currentGrade, desiredStar, desiredGrade, wasCurrentLocked, wasDesiredLocked] = params;
      const wasCurrentBenderLocked = wasCurrentLocked === '1';
      const wasDesiredBenderLocked = wasDesiredLocked === '1';

      const currentKey = `${currentStar}StarGrade${currentGrade}`;
      const desiredKey = `${desiredStar}StarGrade${desiredGrade}`;
      
      const sortedKeys = Object.keys(SHARD_VALUE_TABLE).sort((a, b) => {
        const starA = parseInt(a.charAt(0), 10);
        const gradeA = parseInt(a.charAt(a.length - 1), 10);
        const starB = parseInt(b.charAt(0), 10);
        const gradeB = parseInt(b.charAt(b.length - 1), 10);
        if (starA !== starB) return starA - starB;
        return gradeA - gradeB;
      });

      const startIndex = sortedKeys.indexOf(currentKey);
      const endIndex = sortedKeys.indexOf(desiredKey);

      const currentVisual = getVisualRepresentation(currentStar, currentGrade, wasCurrentBenderLocked, !wasCurrentBenderLocked);
      const desiredVisual = getVisualRepresentation(desiredStar, desiredGrade, wasDesiredBenderLocked, !wasDesiredBenderLocked);

      // Handle "unlock only" edge case
      if (startIndex === endIndex && wasCurrentBenderLocked) {
        const upgradeCostLine = `The total shards required to go from **${currentVisual}** to **${desiredVisual}** is: **10** (including +10 for unlock fee)`;
        const spentSoFarLine = `You have spent **0** on your Character so Far`;
        return interaction.update({
          content: `${upgradeCostLine}\n${spentSoFarLine}`,
          components: [],
        });
      }

      if (startIndex === -1 || endIndex === -1) { return interaction.update({ content: 'There was an internal error finding the selected values. Please try again.', components: [] }); }
      if (startIndex >= endIndex) { return interaction.update({ content: 'Invalid selection range. The desired level must be higher than the current level.', components: [] }); }

      // --- Calculation for "Shards to Upgrade" ---
      const keysToSum = sortedKeys.slice(startIndex + 1, endIndex + 1);
      let totalShards = keysToSum.reduce((sum, key) => sum + SHARD_VALUE_TABLE[key], 0);
      if (wasCurrentBenderLocked) {
        totalShards += 10;
      }

      // --- Calculation for "Shards Spent So Far" ---
      let numberOfShardsSpent = 0;
      if (!wasCurrentBenderLocked) {
        const keysForSpentSoFar = sortedKeys.slice(0, startIndex + 1);
        numberOfShardsSpent = keysForSpentSoFar.reduce((sum, key) => sum + SHARD_VALUE_TABLE[key], 0);
        numberOfShardsSpent += 10;
      }

      // --- Final Message ---
      const upgradeCostLine = `The total shards required to go from **${currentVisual}** to **${desiredVisual}${wasCurrentBenderLocked ? '🔓' : ''}** is: **${totalShards}** ${wasCurrentBenderLocked ? '(including +10 for unlock fee)' : ''}`;
      const spentSoFarLine = `You have spent **${numberOfShardsSpent}** on your Character so Far`;

      await interaction.update({
        content: `${upgradeCostLine}\n${spentSoFarLine}`,
        components: [],
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
