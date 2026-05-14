
IF DBO.OBJECT_ID('SP_IMPORTA_LISTA_PEDIDOS_TECNOSPEED') IS NOT NULL DROP PROCEDURE SP_IMPORTA_LISTA_PEDIDOS_TECNOSPEED
GO

CREATE PROCEDURE SP_IMPORTA_LISTA_PEDIDOS_TECNOSPEED ( @XML AS XML )  
AS 
SET NOCOUNT ON  


    IF OBJECT_ID('tempdb.dbo.#TBtemp_xml', 'u') IS NOT NULL BEGIN
	    DROP TABLE #TBtemp_xml
    END 

    DECLARE @ERROR NVARCHAR(MAX)

    CREATE TABLE #TBtemp_xml (DFid_integracao NVARCHAR(200)) 

    BEGIN TRY

        INSERT INTO #TBtemp_xml
        SELECT pedido.value('(id)[1]'                   , 'NVARCHAR(MAX)')
          FROM @xml.nodes('Parametros/data') AS T(pedido);

    END TRY BEGIN CATCH

	    SET @ERROR = 'ERRO CRIAR E POPULAR TABELA TEMPORARIA COM OS REGISTROS DO XML'
	    EXEC SP_GRAVA_LOG_ERRO_INTEGRACAO @XML, 'SP_IMPORTA_LISTA_PEDIDOS_TECNOSPEED', @ERROR  
	    SELECT @ERROR
        RETURN;

    END CATCH

    BEGIN TRANSACTION 
	
	    BEGIN TRY

		    INSERT INTO TBpedido_venda_integracao
			     ( DFid_integracao
			     , DFcod_pedido_venda
			     , DFdata_atualizacao )
		    SELECT DFid_integracao
			     , NULL
			     , GETDATE()
		      FROM #TBtemp_xml
		     WHERE DFid_integracao NOT IN (SELECT DFid_integracao FROM TBpedido_venda_integracao WITH(NOLOCK))

	    END TRY BEGIN CATCH

		    SET @ERROR = 'ERRO INSERINDO REGISTROS TBpedido_venda_integracao'
		    ROLLBACK TRANSACTION
		    EXEC SP_GRAVA_LOG_ERRO_INTEGRACAO @XML, 'SP_IMPORTA_LISTA_PEDIDOS_TECNOSPEED', @ERROR  
		    SELECT @ERROR
		    RETURN;

	    END CATCH

    COMMIT TRANSACTION 







