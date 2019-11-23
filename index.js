const OCTranspo = require('oc-transpo-js').default;
const Discord = require('discord.js');

const tokens = {
    discord: process.env.DISCORD_API_TOKEN,
    octranspo: process.env.OCTRANSPO_API_TOKEN,
};

const client = new Discord.Client();
const api = new OCTranspo(process.env.OCTRANSPO_CLIENT_ID, tokens.octranspo);

client.on('ready', async () => {
    try {
        await client.user.setPresence({
            game: {name: '| DM me a stop number!', type: 'WATCHING'}, 
        });
    } catch (err) {
        console.error(err);
    }
});

client.on('message', async (message) => {
    if (message.channel.type !== 'dm') return;
    if (!message.content || isNaN(message.content)) return;
    
    try {
        const stop = await api.stopTrips(Number(message.content));
   
        const routes = stop.routes.filter((route) => route.trips.length > 0);
        const lines = routes.map((route) => {
            return `**${route.number} ${route.heading}** — `
                + timeString(route.trips);
        });

        const maxBuffer = 1800;
        let bufferSize = 0;
        const buffer = [[]];
        for (const line of lines) {
            bufferSize += line.length;
            if (bufferSize > maxBuffer) {
                buffer.push([line]);
                bufferSize = line.length;
            } else {
                buffer[buffer.length - 1].push(line);
            }
        }

        const bodies = buffer.map((group) => group.join('\n'));
        const embeds = [
            new Discord.RichEmbed({
                title: stop.name,
                description: bodies[0]
            })
        ];
        
        for (const body of bodies.slice(1)) {
            embeds.push(new Discord.RichEmbed({description: body}));
        }

        for (const embed of embeds) {
            await message.channel.send({embed});
        }
    } catch (err) {
        message.channel.send(err.message);
    }
});

function timeString(trips) {
    const etas = trips
        .sort((tripA, tripB) => Number(tripA.eta) - Number(tripB.eta))
        .map((trip) => formatTime(trip.eta));
    const times = etas.map((eta, i) => {
        if (!trips[i].bus) return eta;
        if (!trips[i].bus.gps) return eta;
        return `${eta}\*`;
    });
    if (times.length === 0) return null;
    if (times.length === 1) return times[0];
    if (times.length === 2) return `${times[0]} & ${times[1]}`;
    return `${times.slice(0, -1).join(', ')} & ${times[times.length - 1]}`;
}

function formatTime(time) {
    return time < 60 ?
        time :
        `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`;
}

client.login(tokens.discord);
