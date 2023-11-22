<?php

declare(strict_types=1);

namespace Bold\Checkout\Block\System\Config\Form\Field;

use Bold\Checkout\Block\System\Config\Form\Field;
use Bold\Checkout\Model\ModuleInfo\ModuleComposerVersionProvider;
use Magento\Backend\Block\Template\Context;
use Magento\Framework\Data\Form\Element\AbstractElement;

/**
 * Bold Integration module version field.
 */
class Version extends Field
{
    protected $unsetScope = true;

    /**
     * @var ModuleComposerVersionProvider
     */
    private $moduleVersionProvider;

    /**
     * @var string
     */
    private $moduleName;

    /**
     * @param Context $context
     * @param ModuleComposerVersionProvider $moduleVersionProvider
     * @param array $data
     */
    public function __construct(
        Context                       $context,
        ModuleComposerVersionProvider $moduleVersionProvider,
        string                        $moduleName = '',
        array                         $data = []
    ) {
        parent::__construct($context, $data);
        $this->moduleVersionProvider = $moduleVersionProvider;
        $this->moduleName = $moduleName;
    }

    /**
     * @inheritDoc
     */
    protected function _renderValue(AbstractElement $element)
    {
        $version = $this->moduleVersionProvider->getVersion($this->moduleName);
        $element->setText($version);

        return parent::_renderValue($element);
    }
}
