<?php
declare(strict_types=1);

namespace Bold\Checkout\Observer\Checkout;

use Bold\Checkout\Api\Http\ClientInterface;
use Bold\Checkout\Model\BoldIntegration;
use Bold\Checkout\Model\Config;
use Bold\Checkout\Model\ConfigInterface;
use Exception;
use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;
use Magento\Store\Model\StoreManagerInterface;

/**
 * Observe 'admin_system_config_changed_section_checkout' event and re-new shop identifier.
 */
class CheckoutSectionSave implements ObserverInterface
{
    private const SHOP_INFO_URL = 'shops/v1/info';

    /**
     * @var ClientInterface
     */
    private $client;

    /**
     * @var ConfigInterface
     */
    private $config;

    /**
     * @var BoldIntegration
     */
    private $updateIntegration;

    /**
     * @var StoreManagerInterface
     */
    private $storeManager;

    /**
     * @param ConfigInterface $config
     * @param ClientInterface $client
     * @param BoldIntegration $updateIntegration
     * @param StoreManagerInterface $storeManager
     */
    public function __construct(
        ConfigInterface $config,
        ClientInterface $client,
        BoldIntegration $updateIntegration,
        StoreManagerInterface $storeManager
    ) {
        $this->client = $client;
        $this->config = $config;
        $this->updateIntegration = $updateIntegration;
        $this->storeManager = $storeManager;
    }

    /**
     * Retrieve shop id from Bold and save it in config.
     *
     * @param Observer $observer
     * @return void
     * @throws Exception
     */
    public function execute(Observer $observer): void
    {
        $event = $observer->getEvent();
        $websiteId = (int)$event->getWebsite() ?: (int)$this->storeManager->getWebsite(true)->getId();
        $this->config->setShopId($websiteId, null);
        $shopInfo = $this->client->get($websiteId, self::SHOP_INFO_URL);
        if ($shopInfo->getErrors()) {
            $error = current($shopInfo->getErrors());
            throw new Exception($error);
        }
        $this->config->setShopId($websiteId, $shopInfo->getBody()['shop_identifier']);
        $changedPaths = $event->getChangedPaths();
        if (!array_intersect($changedPaths, Config::INTEGRATION_PATHS)
            && $this->updateIntegration->getStatus($websiteId) !== null) {
            return;
        }
        $this->updateIntegration->update($websiteId);
    }
}
