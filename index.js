const OCTranspo = require('oc-transpo-js');
const Discord = require('discord.js');

const tokens = {
    discord: process.env.DISCORD_API_TOKEN,
    octranspo: process.env.OCTRANSPO_API_TOKEN,
};

const client = new Discord.Client();
const api = new OCTranspo(process.env.OCTRANSPO_CLIENT_ID, tokens.octranspo);

client.on('message', async (message) => {
    if (message.channel.type !== 'dm') return;
    if (!message.content || isNaN(message.content)) return;
    
    try {
        const result = await api.getNextTripsForStop(Number(message.content));
        if (result['Error']) {
            throw Error(
                `Sorry, I could not find info for stop ${message.content}`
            );
        }

        const embed = new Discord.RichEmbed();
        embed.setTitle(result['StopDescription']);
        
        const routeData =  result['Routes']['Route'];
        const routes = Array.isArray(routeData) ?
            routeData.map(formatRoute) :
            [formatRoute(routeData)];

        const activeRoutes = routes
            .filter((route) => route.times !== null)
            .map((route) => `${route.label} - ${route.times}`);
        embed.setDescription(activeRoutes.join('\n'));

        message.channel.send({embed});
    } catch (err) {
        message.channel.send(err.message);
    }
});

function formatRoute(route) {
    const label = `**${route['RouteNo']} ${route['RouteHeading']}**`;
    const tripData = route['Trips'];
    const times = Array.isArray(tripData) ? 
        formatTrips(tripData) :
        formatTrips(tripData['Trip'] || [tripData]);
    return {label: label, times: times};
}

function formatTrips(trips) {
    const times = trips.map((trip) => {
        const time = Number(trip['AdjustedScheduleTime']);
        const realtime = trip['Latitude'] != '';
        const adjusted = time < 60 ?
            time : 
            `${Math.floor(time / 60)}:${time % 60}` ;
        return realtime ? `${adjusted}\\*` : adjusted;
    });
    if (times.length === 0) return null;
    if (times.length === 1) return times[0];
    if (times.length === 2) return `${times[0]} & ${times[1]}`;
    return `${times.slice(0, -1).join(', ')} & ${times[times.length - 1]}`;
}

client.login(tokens.discord);