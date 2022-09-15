import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { Contract, utils } from 'ethers'
import { RotatingSquare } from 'react-loader-spinner'
import { BiMessageError, BiMessageCheck, BiMessageDetail, BiChevronDown, BiChevronUp } from 'react-icons/bi'

import SelectChain from '../select/chain'
import Wallet from '../wallet'
import Image from '../image'
import Alert from '../alerts'
import { number_format } from '../../lib/utils'

const ABI = [
  // Read-Only Functions
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  // Authenticated Functions
  'function transfer(address to, uint amount) returns (boolean)',
  'function mint(address account, uint256 amount)',
]

export default ({
  token_id = 'test',
  faucet_amount = Number(process.env.NEXT_PUBLIC_FAUCET_AMOUNT) || 1000,
  contract_data,
}) => {
  const { chains, assets, wallet } = useSelector(state => ({ chains: state.chains, assets: state.assets, wallet: state.wallet }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { wallet_data } = { ...wallet }
  const { chain_id, provider, address, signer } = { ...wallet_data }

  const [collapse, setCollapse] = useState(true)
  const [data, setData] = useState(null)
  const [minting, setMinting] = useState(null)
  const [mintResponse, setMintResponse] = useState(null)

  const fields = [
    {
      label: 'Chain',
      name: 'chain',
      type: 'select-chain',
      placeholder: 'Select chain to faucet',
    },
    {
      label: 'Recipient Address',
      name: 'address',
      type: 'text',
      placeholder: 'Faucet token to an address',
    },
  ]

  useEffect(() => {
    if (chain_id && address) {
      setData({
        ...data,
        address: data ? data.address : address,
        chain: chains_data?.find(c => c?.chain_id === chain_id)?.id || data?.chain,
      })
    }
  }, [chain_id, address])

  useEffect(() => {
    setMintResponse(null)
  }, [data])

  const mint = async () => {
    setMinting(true)
    setMintResponse(null)
    try {
      const asset_data = assets_data?.find(a => a?.id === token_id)
      const contract_data = contract_data || asset_data?.contracts?.find(c => c?.chain_id === chain_id)
      const {
        contract_address,
        decimals,
      } = { ...contract_data }
      const contract = new Contract(contract_address, ABI, signer)
      const response = await contract.mint(data?.address, utils.parseUnits(faucet_amount.toString(), decimals || 18))
      const receipt = await signer.provider.waitForTransaction(response.hash)
      setMintResponse({
        status: !receipt?.status ? 'failed' : 'success',
        message: !receipt?.status ? 'Failed to faucet' : 'Faucet Successful',
        ...response,
      })
    } catch (error) {
      setMintResponse({
        status: 'failed',
        message: error?.data?.message || error?.message,
      })
    }
    setMinting(false)
  }

  const chain_data = chains_data?.find(c => c?.id === data?.chain)
  const asset_data = assets_data?.find(a => a?.id === token_id)

  const hasAllFields = fields.length === fields.filter(f => data?.[f.name]).length
  const is_walletconnect = provider?.constructor?.name === 'WalletConnectProvider'
  const disabled = minting

  return asset_data && (
    <div className="w-full max-w-lg flex flex-col items-center justify-center">
      <button
        onClick={() => setCollapse(!collapse)}
        className="w-full flex items-center justify-center text-base font-semibold space-x-1.5 py-4"
      >
        {!signer && (
          <span className="whitespace-nowrap">
            Connect wallet to
          </span>
        )}
        <span className="uppercase tracking-wider font-medium">
          Faucet
        </span>
        {collapse ?
          <BiChevronDown size={18} /> :
          <BiChevronUp size={18} />
        }
      </button>
      {!collapse && (
        <div className="w-full mb-2">
          {fields.map((f, i) => (
            <div key={i} className="form-element">
              {f.label && (
                <div className="form-label text-slate-600 dark:text-slate-400 font-medium">
                  {f.label}
                </div>
              )}
              {f.type === 'select-chain' ?
                <div className="-mt-2">
                  <SelectChain
                    disabled={disabled}
                    value={data?.[f.name]}
                    onSelect={c => setData({ ...data, [`${f.name}`]: c })}
                  />
                </div>
                :
                <input
                  type={f.type}
                  disabled={disabled}
                  placeholder={f.placeholder}
                  value={data?.[f.name]}
                  onChange={e => setData({ ...data, [`${f.name}`]: e.target.value })}
                  className="form-input border-0 focus:ring-0 rounded-lg"
                />
              }
            </div>
          ))}
          {signer && hasAllFields && (
            <div className="flex justify-end space-x-2 mb-2">
              <button
                disabled={disabled}
                onClick={() => {
                  setCollapse(!collapse)
                  setData({
                    ...data,
                    address,
                    chain: chains_data?.find(c => c?.chain_id === chain_id)?.id,
                  })
                }}
                className={`bg-transparent hover:bg-slate-100 dark:hover:bg-slate-900 ${disabled ? 'cursor-not-allowed' : ''} rounded-lg font-semibold py-2 px-3`}
              >
                Cancel
              </button>
              {chain_data?.chain_id !== chain_id ?
                <Wallet
                  connectChainId={chain_data?.chain_id}
                  className={`bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 ${disabled ? 'cursor-not-allowed' : ''} rounded-lg flex items-center text-white font-semibold space-x-1.5 py-2 px-3`}
                >
                  <span className="mr-1 sm:mr-1.5">
                    {is_walletconnect ? 'Reconnect' : 'Switch'} to
                  </span>
                  {chain_data?.image && (
                    <Image
                      src={chain_data.image}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  )}
                  <span className="font-semibold">
                    {chain_data?.name}
                  </span>
                </Wallet>
                :
                <button
                  disabled={disabled}
                  onClick={() => mint()}
                  className={`bg-blue-600 hover:bg-blue-700 ${disabled ? 'cursor-not-allowed' : ''} rounded-lg flex items-center text-white font-semibold space-x-1.5 py-2 px-3`}
                >
                  {minting && (
                    <RotatingSquare
                      color="white"
                      width="16"
                      height="16"
                    />
                  )}
                  <span>
                    Faucet
                  </span>
                  <span className="font-bold">
                    {number_format(
                      faucet_amount,
                      '0,0.00',
                    )}
                  </span>
                  <span>
                    {contract_data?.symbol || asset_data.symbol}
                  </span>
                </button>
              }
            </div>
          )}
        </div>
      )}
      {mintResponse && (
        <div className="w-full mx-2 sm:mx-4">
          <Alert
            color={`${mintResponse.status === 'failed' ? 'bg-red-400 dark:bg-red-500' : mintResponse.status === 'success' ? 'bg-green-400 dark:bg-green-500' : 'bg-blue-400 dark:bg-blue-500'} text-white mb-4 sm:mb-6`}
            icon={mintResponse.status === 'failed' ? <BiMessageError className="w-4 sm:w-5 h-4 sm:h-5 stroke-current mt-0.5 mr-2.5" /> : mintResponse.status === 'success' ? <BiMessageCheck className="w-4 sm:w-5 h-4 sm:h-5 stroke-current mt-0.5 mr-2.5" /> : <BiMessageDetail className="w-4 sm:w-5 h-4 sm:h-5 stroke-current mt-0.5 mr-2.5" />}
            rounded={true}
            className="mx-0"
          >
            <div className="flex items-center justify-between space-x-1">
              <span className="break-all leading-5 text-xs">
                {mintResponse.message}
              </span>
              {['success'].includes(mintResponse.status) && mintResponse.hash && chain_data?.explorer?.url && (
                <a
                  href={`${chain_data.explorer.url}${chain_data.explorer.transaction_path?.replace('{tx}', mintResponse.hash)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pr-1.5"
                >
                  <span className="whitespace-nowrap text-xs font-semibold">
                    View on {chain_data.explorer.name}
                  </span>
                </a>
              )}
            </div>
          </Alert>
        </div>
      )}
    </div>
  )
}