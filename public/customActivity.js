window.onload = function () {
  const connection = new Postmonger.Session();
  let payload = {};

  connection.trigger('ready');

  connection.on('initActivity', data => {
    payload = data || {};

    const savedCountry =
      payload?.arguments?.execute?.inArguments?.find(a => a.country)?.country;

    if (savedCountry) document.getElementById('country').value = savedCountry;
  });

  connection.on('clickedNext', () => {
    const country = document.getElementById('country').value;

    payload.arguments = payload.arguments || {};
    payload.arguments.execute = payload.arguments.execute || {};

    const args = payload.arguments.execute.inArguments || [];
    payload.arguments.execute.inArguments =
      args.filter(a => !a.country).concat([{ country, namespace: 'Activity' }]);

    payload.metaData = { isConfigured: true, label: `Country: ${country}` };
    payload.name = `Window Check (${country})`;

    connection.trigger('updateActivity', payload);
  });
};
