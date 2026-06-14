const { Composio } = require('@composio/core');

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY
});

// @desc    Initiate an integration connection
// @route   POST /api/integrations/connect
// @access  Private
const connectIntegration = async (req, res) => {
  try {
    const { appName } = req.body;
    
    if (!appName) {
      return res.status(400).json({ message: 'appName is required' });
    }

    const userId = req.user._id.toString();
    const redirectUrl = req.headers.origin || 'http://localhost:5173';

    // Dynamically fetch the correct Auth Config ID from Composio
    const authConfigs = await composio.authConfigs.list();
    const targetConfig = authConfigs.items.find(c => c.toolkit.slug === appName);

    if (!targetConfig) {
      return res.status(404).json({ message: `Auth Config for ${appName} not found. Please enable it on your Composio Dashboard.` });
    }

    const connectionRequest = await composio.connectedAccounts.link(
      userId,
      targetConfig.id,
      { callbackUrl: redirectUrl, allowMultiple: true }
    );

    res.status(200).json({ redirectUrl: connectionRequest.redirectUrl });
  } catch (error) {
    console.error('Integration Error:', error);
    res.status(500).json({ message: 'Failed to initiate connection', error: error.message });
  }
};

// @desc    Get connected integrations
// @route   GET /api/integrations
// @access  Private
const getConnectedIntegrations = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    // IMPORTANT: The SDK requires `userIds` (array), NOT `userId` (singular).
    // Passing `userId` is silently ignored by the schema, returning ALL accounts.
    const connections = await composio.connectedAccounts.list({
      userIds: [userId],
      statuses: ['ACTIVE']
    });
    
    const activeIntegrations = connections.items
      .map(c => c.toolkit?.slug || c.appName);
      
    res.status(200).json([...new Set(activeIntegrations)]);
  } catch (error) {
    console.error('Fetch Integrations Error:', error);
    res.status(500).json({ message: 'Failed to fetch integrations', error: error.message });
  }
};

module.exports = {
  connectIntegration,
  getConnectedIntegrations
};
