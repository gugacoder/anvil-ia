IF OBJECT_ID('sp_faturar_pedido_plug4market') IS NOT NULL
    DROP PROCEDURE sp_faturar_pedido_plug4market
GO

CREATE PROCEDURE sp_faturar_pedido_plug4market(@ID_INTEGRACAO_PEDIDO NVARCHAR(50))
WITH ENCRYPTION 
AS
BEGIN

	/*
    AUTOR......: Diego Mattos
    AREA.......: Comercial
    MODULO.....: -
    DATA\HORA..: 31/12/2025
    
    Função: Retorna os dados do faturamento do pedido (data de emissão, número, série, chave de acesso e xml da NF-e) para envio ao marketplace via Plug4Market

    Exemplo de uso:
    EXEC sp_faturar_pedido_plug4market '97c7d3ad-b699-4cc9-bd71-43ce1a659397' 
    */

    SELECT tbnota_fiscal_saida.dfdata_emissao      AS nfeDate,
       tbnota_fiscal_saida.dfnumero                AS nfeNumber,
       tbnota_fiscal_saida.dfserie                 AS nfeSerialNumber,
       tblote_nfe_nota_fiscal_saida.dfchave        AS nfeAccessKey,
       Cast(vw_xml_nfe.dfxml AS NVARCHAR(max)) AS 'xml'
	FROM   tbpedido_venda_nota_fiscal_saida WITH (nolock)
       INNER JOIN tbpedido_venda WITH (nolock)
               ON tbpedido_venda.dfcod_pedido_venda =
                  tbpedido_venda_nota_fiscal_saida.dfcod_pedido_venda
       INNER JOIN tbpedido_venda_site WITH (nolock)
               ON tbpedido_venda_site.dfcod_pedido_venda =
                  tbpedido_venda.dfcod_pedido_venda
       INNER JOIN tbpedido_venda_integracao WITH (nolock)
               ON tbpedido_venda_integracao.dfid_pedido_venda_integracao =
                  tbpedido_venda_site.numeropedidoafv
       INNER JOIN tbnota_fiscal_saida WITH (nolock)
               ON tbnota_fiscal_saida.dfcod_pedido_venda =
                  tbpedido_venda_nota_fiscal_saida.dfcod_pedido_venda
       INNER JOIN tblote_nfe_nota_fiscal_saida WITH (nolock)
               ON tblote_nfe_nota_fiscal_saida.dfid_nota_fiscal_saida =
                  tbpedido_venda_nota_fiscal_saida.dfid_nota_fiscal_saida
       INNER JOIN vw_xml_nfe WITH (nolock)
			   ON vw_xml_nfe.chNFe = tblote_nfe_nota_fiscal_saida.dfchave
	WHERE  tbpedido_venda_integracao.dfid_integracao = @ID_INTEGRACAO_PEDIDO
	FOR xml path('retorno'), type 
END
GO
